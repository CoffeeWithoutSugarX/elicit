import { z } from 'zod';
import { formatVisualBlock } from './_shared';
import { KnowledgeCardSchema } from '@/agents/schemas/KnowledgeCardSchema';
import type { SanitizedQuestion } from '@/agents/schemas/OcrSchema';
import type { ElicitGraphState } from '@/agents/schemas/ElicitGraphStateSchema';
import type { BaseMessage } from '@langchain/core/messages';
import { buildStudentContext } from '@/agents/prompts/studentContext';
import { studentGradeTerm } from '@/agents/data/studentProfile';

// ——— 系统提示词 ———
// §4.3.6 ReviewNode (Pólya ④ 回顾) — B4 多小问汇总 + P-105 知识卡片 + subProblemSummaries
// P-001 学情知识边界：注入学情块（含宽容条款）+ 严禁主动引入未学概念
const _studentCtx = buildStudentContext(studentGradeTerm);

export const systemPrompt = `${_studentCtx}

【严禁主动引入未学概念/术语】参照上方学情块，未学范围的定理/方法名严禁出现在你的回顾语与知识卡片中。

你是引思助手，当前处于波利亚四阶段的【④ 回顾】。

【你的目标】先用 1~2 个元认知问句让妹妹自反，再输出一张 P-105 知识点卡片，会话进入终态。
对于多小问题（subProblems.length ≥ 2），卡片中要包含每个小问的破题点；blocked 小问额外标"未突破，建议看老师讲解"。

【元认知问句池 — 选 1~2 个】
- "有没有更短 / 更省力的路？"
- "题目的条件如果再放宽一点 / 严一点，结果会变吗？"
- "这道题像不像你之前做过的某一道？这类题以后再遇到，你第一步会怎么想？"

【输出格式 — 两段】

第一段：面向妹妹的回顾对话，≤200 字
（含 1~2 个元认知问句 + 一句肯定；多小问题时简述各小问主要思路）

第二段：知识点卡片 JSON，格式如下（用 \`\`\`json 包裹）：

\`\`\`json
{
  "schemaVersion": 1,
  "type": "knowledge_card",
  "knowledgePoints": [
    { "name": "<≤40 字>", "textbookRef": "<逐字取自术语库「出处」列，如 七下 §1，可选>" }
  ],
  "methods": [
    { "name": "<≤40 字>", "category": <0|1|2|3|4> }
  ],
  "insight": "<一句话思路回顾，≤150 字；多小问题时分段写各小问破题点>",
  "subProblemSummaries": [
    {
      "index": <0-based 序号>,
      "status": "done" | "blocked",
      "insightPoints": ["<破题点 1>", "<破题点 2>"],
      "blockedHint": "<仅 blocked 时填，≤40 字 推荐看老师讲解的具体卡点>"
    }
  ]
}
\`\`\`

字段约束：
- knowledgePoints 1~3 个；methods 1~2 个；category 0=代数变形/1=几何辅助线/2=函数性质/3=统计分析/4=其他
- \`subProblemSummaries\` 长度 = state.subProblems.length（与 ClassifyNode 拷入的小问数一致）；每个 item 的 insightPoints 从 state.subProblems[i].insightPoints 透传 + 提炼

最后一行：phase_signal: "COMPLETED"

【严禁】
- 严禁卡片字段超出约束（条数 / 字数）
- 严禁卡片 JSON 之外的部分（第一段）超过 200 字
- 严禁对 blocked 小问给出具体解答 / 数值答案（保留"思考空间"）`;

// ——— 用户提示词模板 ———
// v0.1.1 B4：传所有 subProblems 状态 + 历史 insightPoints + visualDescription
export interface ReviewNodeInput {
    selectedQuestion: SanitizedQuestion;
    state: Pick<ElicitGraphState, 'subProblems' | 'currentSubProblemIndex' | 'problemType'>;
    recentMessages: Pick<BaseMessage, 'getType' | 'content'>[];
    knowledgePointsCsv: string;
}

export function userPromptTemplate({
    selectedQuestion,
    state,
    recentMessages,
    knowledgePointsCsv,
}: ReviewNodeInput): string {
    const visual = formatVisualBlock(selectedQuestion);
    const allSubs = state.subProblems.map((sp, i) => {
        const status = sp.status;  // 'done' | 'blocked'（ReviewNode 进入时所有 ∈ {done, blocked}）
        const insights = sp.insightPoints.length
            ? sp.insightPoints.map((p, j) => `   ${j + 1}. ${p}`).join('\n')
            : '   （无显式破题点记录）';
        return `小问 ${i + 1}: ${sp.goal}
  状态: ${status}
  已积累的破题点:
${insights}`;
    }).join('\n\n');

    return `# 题目（已完成全部小问）
${selectedQuestion.topic} / 题型 code = ${state.problemType}
LaTeX：${selectedQuestion.latexFull}

${visual}

# 所有小问的完成状态与破题点（B4 多小问汇总；单问题题 length=1 统一路径）
共 ${state.subProblems.length} 个小问：

${allSubs}

# 知识点术语库（输出 knowledgePoints[].name 时优先选用本表标准名；textbookRef 必须从上表中选用，表中只含妹妹已学内容）
${knowledgePointsCsv}

# 对话历史（最近 8 轮）
${recentMessages.map(m => `${m.getType()}: ${m.content}`).join('\n')}

请按 System 规则输出：第一段元认知问句对话（≤200 字）+ 第二段 P-105 知识点卡片 JSON（含 subProblemSummaries[] 字段对齐 state.subProblems 长度与顺序）。`;
}

// ——— 输出契约 ———
// ReviewNode 只有 COMPLETED；卡片内容用 KnowledgeCardSchema 校验
export const outputContract = z.object({
    cleanContent: z.string().min(1),
    signal: z.literal('COMPLETED'),
    knowledgeCard: KnowledgeCardSchema,
});

// ——— few-shots ———
// 2 组覆盖：单问多破题点（七下纲内几何证明）/ 多小问 + 1 个 blocked（B4 subProblemSummaries）
// P-001 修正：fixture 1 用干净的纲内证明路线（SSS 全等→顶角平分线→三线合一）；
//            fixture 2 整组改为七下整式乘除题材，消除「术语库只含已学内容」自相矛盾；
//            textbookRef 一律去「北师大」前缀，逐字取自 CSV「出处」列。
export const fewShots: ReadonlyArray<{ user: string; assistant: string }> = [
    {
        // fixture 1 — 单问多破题点（七下纲内几何：等腰△内点 OB=OC 证 AO⊥BC；subProblems.length=1，done，3 破题点）
        user: `# 题目（已完成全部小问）
等腰三角形内点对称与全等 / 题型 code = 1
LaTeX：在等腰三角形 $\\triangle ABC$ 中，$AB=AC$，点 $O$ 在 $\\triangle ABC$ 内部，且 $OB=OC$，求证：$AO \\perp BC$。

# 所有小问的完成状态与破题点（B4 多小问汇总；单问题题 length=1 统一路径）
共 1 个小问：

小问 1: 证明 AO⊥BC
  状态: done
  已积累的破题点:
   1. △ABO≅△ACO（SSS：AB=AC、OB=OC、AO 公共）
   2. 由全等得 ∠BAO=∠CAO，即 AO 平分顶角 ∠BAC
   3. 等腰三角形三线合一：顶角平分线所在直线垂直于底边，故 AO⊥BC

# 知识点术语库（输出 knowledgePoints[].name 时优先选用本表标准名；textbookRef 必须从上表中选用，表中只含妹妹已学内容）
KP-011,全等三角形,SSS/SAS/ASA/AAS/全等测距离,七下,七下 §4.2-4.3
KP-012,图形的轴对称,等腰三角形/三线合一/垂直平分线的性质,七下,七下 §5

# 对话历史（最近 8 轮）
human: 先用 SSS 全等证 ∠BAO=∠CAO，AO 是顶角平分线，三线合一所以 AO⊥BC
ai: 完全正确！

请按 System 规则输出：第一段元认知问句对话（≤200 字）+ 第二段 P-105 知识点卡片 JSON（含 subProblemSummaries[] 字段对齐 state.subProblems 长度与顺序）。`,
        assistant: `你这次证明走得很稳！先用 SSS 全等推出 ∠BAO=∠CAO，再借等腰三角形三线合一拿到 AO⊥BC——每一步都扣得很准。回头想想：如果去掉"OB=OC"这个条件，结论还成立吗？以后遇到"等腰三角形 + 内部对称点"类题，第一步你会怎么想？

\`\`\`json
{
  "schemaVersion": 1,
  "type": "knowledge_card",
  "knowledgePoints": [
    { "name": "全等三角形", "textbookRef": "七下 §4.2-4.3" },
    { "name": "图形的轴对称", "textbookRef": "七下 §5" }
  ],
  "methods": [
    { "name": "SSS 全等", "category": 1 },
    { "name": "等腰三角形三线合一", "category": 1 }
  ],
  "insight": "由 AB=AC、OB=OC、AO 公共边证 △ABO≅△ACO（SSS），得 ∠BAO=∠CAO 即 AO 平分顶角；再用等腰三角形三线合一，顶角平分线垂直于底边，故 AO⊥BC。",
  "subProblemSummaries": [
    {
      "index": 0,
      "status": "done",
      "insightPoints": ["SSS 证 △ABO≅△ACO", "全等得 AO 平分顶角 ∠BAC", "三线合一得 AO⊥BC"]
    }
  ]
}
\`\`\`
phase_signal: "COMPLETED"`,
    },
    {
        // fixture 2 — 多小问 + 1 个 blocked（subProblems.length=2，status=[done, blocked]）
        // P-001 修正：整组改为七下整式乘除（平方差公式），与「术语库只含已学内容」一致
        user: `# 题目（已完成全部小问）
整式乘除与乘法公式 / 题型 code = 0
LaTeX：(1) 计算 $(a+b)(a-b)$；(2) 利用乘法公式计算 $102 \\times 98$。

# 所有小问的完成状态与破题点（B4 多小问汇总；单问题题 length=1 统一路径）
共 2 个小问：

小问 1: 计算 (a+b)(a-b)
  状态: done
  已积累的破题点:
   1. 识别平方差公式结构 (a+b)(a-b)=a²-b²

小问 2: 利用乘法公式计算 102×98
  状态: blocked
  已积累的破题点:
   （无显式破题点记录）

# 知识点术语库（输出 knowledgePoints[].name 时优先选用本表标准名；textbookRef 必须从上表中选用，表中只含妹妹已学内容）
KP-007,整式的乘除,幂运算/乘法公式/平方差/完全平方,七下,七下 §1

# 对话历史（最近 8 轮）
human: 第二问我不知道怎么用公式
ai: 这一步涉及的是平方差公式，常见做法是把数凑成两数和与差的乘积。你试着按这个方向再想？

请按 System 规则输出：第一段元认知问句对话（≤200 字）+ 第二段 P-105 知识点卡片 JSON（含 subProblemSummaries[] 字段对齐 state.subProblems 长度与顺序）。`,
        assistant: `第一问你很棒，一眼认出了平方差公式 $(a+b)(a-b)=a^2-b^2$！第二问把 102×98 凑成乘法公式这一步还没突破，可以看看老师讲的"凑整 + 平方差"那一类例子。以后遇到"用乘法公式简便计算"类题，第一步你会怎么观察呢？

\`\`\`json
{
  "schemaVersion": 1,
  "type": "knowledge_card",
  "knowledgePoints": [
    { "name": "整式的乘除", "textbookRef": "七下 §1" }
  ],
  "methods": [
    { "name": "套用平方差公式 (a+b)(a-b)=a²-b²", "category": 0 },
    { "name": "凑整后用乘法公式简便计算", "category": 0 }
  ],
  "insight": "小问①：识别 (a+b)(a-b) 平方差结构，直接得 a²-b²。小问②：把 102×98 凑成 (100+2)(100-2)，再套平方差公式（未突破）。",
  "subProblemSummaries": [
    {
      "index": 0,
      "status": "done",
      "insightPoints": ["识别平方差公式结构 (a+b)(a-b)=a²-b²"]
    },
    {
      "index": 1,
      "status": "blocked",
      "insightPoints": [],
      "blockedHint": "把 102×98 写成 (100+2)(100-2) 再套平方差公式"
    }
  ]
}
\`\`\`
phase_signal: "COMPLETED"`,
    },
] as const;

// ——— 模型参数 ———
export const modelParams = {
    temperature: 0.3,
    max_tokens: 800,
    streaming: true,
} as const;
