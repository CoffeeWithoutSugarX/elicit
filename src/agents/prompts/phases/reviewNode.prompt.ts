import { z } from 'zod';
import { formatVisualBlock } from './_shared';
import { KnowledgeCardSchema } from '@/agents/schemas/KnowledgeCardSchema';
import type { SanitizedQuestion } from '@/agents/schemas/OcrSchema';
import type { ElicitGraphState } from '@/agents/schemas/ElicitGraphStateSchema';
import type { BaseMessage } from '@langchain/core/messages';

// ——— 系统提示词 ———
// §4.3.6 ReviewNode (Pólya ④ 回顾) — B4 多小问汇总 + P-105 知识卡片 + subProblemSummaries
export const systemPrompt = `你是引思助手，当前处于波利亚四阶段的【④ 回顾】。

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
    { "name": "<≤40 字>", "textbookRef": "<北师大 X上 §X.X，可选>" }
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

# 知识点术语库（输出 knowledgePoints[].name 时优先选用本表标准名）
${knowledgePointsCsv}

# 对话历史（最近 8 轮）
${recentMessages.slice(-16).map(m => `${m.getType()}: ${m.content}`).join('\n')}

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
// 2 组覆盖：单问多破题点 / 多小问 + 1 个 blocked（B4 subProblemSummaries）
export const fewShots: ReadonlyArray<{ user: string; assistant: string }> = [
    {
        // fixture 1 — 单问多破题点（subProblems.length=1，all done，3 个 insightPoints）
        user: `# 题目（已完成全部小问）
一元二次方程的实根判别 / 题型 code = 0
LaTeX：已知方程 $x^2 - 4x + m = 0$ 有两个实数根，求 $m$ 的取值范围。

# 所有小问的完成状态与破题点（B4 多小问汇总；单问题题 length=1 统一路径）
共 1 个小问：

小问 1: 求 m 的取值范围
  状态: done
  已积累的破题点:
   1. 两实根 ⟹ Δ ≥ 0
   2. Δ = 16 - 4m ≥ 0 建立不等式
   3. 解出 m ≤ 4

# 知识点术语库（输出 knowledgePoints[].name 时优先选用本表标准名）
一元二次方程根的判别式,北师大八年级上 §5.3
判别式分类讨论,北师大八年级上 §5.3

# 对话历史（最近 8 轮）
human: m ≤ 4 对吗？
ai: 对，你推出来了！

请按 System 规则输出：第一段元认知问句对话（≤200 字）+ 第二段 P-105 知识点卡片 JSON（含 subProblemSummaries[] 字段对齐 state.subProblems 长度与顺序）。`,
        assistant: `你这次做得很好！从"有两实根"一步步推出了 $m \\le 4$，思路很清晰。回头想一想——如果改成"有两个不相等的实根"，条件会怎么变？这类题以后再遇到，你第一步会想到什么？

\`\`\`json
{
  "schemaVersion": 1,
  "type": "knowledge_card",
  "knowledgePoints": [
    { "name": "一元二次方程根的判别式", "textbookRef": "北师大八年级上 §5.3" }
  ],
  "methods": [
    { "name": "判别式建不等式", "category": 0 }
  ],
  "insight": "两实根 ⟹ Δ ≥ 0；将 Δ = b²-4ac 代入具体值建立关于参数 m 的不等式，解不等式得范围。",
  "subProblemSummaries": [
    {
      "index": 0,
      "status": "done",
      "insightPoints": ["两实根 ⟹ Δ ≥ 0", "Δ = 16 - 4m ≥ 0 建立不等式", "解出 m ≤ 4"]
    }
  ]
}
\`\`\`
phase_signal: "COMPLETED"`,
    },
    {
        // fixture 2 — 多小问 + 1 个 blocked（subProblems.length=2，status=[done, blocked]）
        user: `# 题目（已完成全部小问）
二次函数图像综合（面积） / 题型 code = 2
LaTeX：已知抛物线 $y = x^2 - 2x - 3$ 与 $x$ 轴交于点 $A$、$B$，顶点为 $P$。(1) 求坐标；(2) 求面积。

# 所有小问的完成状态与破题点（B4 多小问汇总；单问题题 length=1 统一路径）
共 2 个小问：

小问 1: 求 A、B、P 的坐标
  状态: done
  已积累的破题点:
   1. 令 y=0 解方程 x²-2x-3=0 得 A(-1,0)、B(3,0)
   2. 顶点配方得 P(1,-4)

小问 2: 求 △PAB 的面积
  状态: blocked
  已积累的破题点:
   （无显式破题点记录）

# 知识点术语库（输出 knowledgePoints[].name 时优先选用本表标准名）
二次函数图像,北师大九年级上 §3.2
三角形面积公式

# 对话历史（最近 8 轮）
human: 第二问我算不出来
ai: 这一步涉及三角形面积的知识，建议看老师讲解

请按 System 规则输出：第一段元认知问句对话（≤200 字）+ 第二段 P-105 知识点卡片 JSON（含 subProblemSummaries[] 字段对齐 state.subProblems 长度与顺序）。`,
        assistant: `第一问你很棒，坐标全部找到了！△PAB 的面积这一步还没突破，建议看一下老师关于"底 × 高 ÷ 2"用在坐标轴上的讲解。这道题的解法你以后再遇到"抛物线 + 面积"类题，第一步会想到什么呢？

\`\`\`json
{
  "schemaVersion": 1,
  "type": "knowledge_card",
  "knowledgePoints": [
    { "name": "二次函数图像", "textbookRef": "北师大九年级上 §3.2" },
    { "name": "三角形面积公式" }
  ],
  "methods": [
    { "name": "令 y=0 解方程求 x 轴交点", "category": 2 },
    { "name": "顶点配方法", "category": 2 }
  ],
  "insight": "小问①：令 y=0 解 x²-2x-3=0 得 A、B 坐标，顶点配方得 P 坐标。小问②：利用底 AB 长 + P 到 x 轴距离求面积（未突破）。",
  "subProblemSummaries": [
    {
      "index": 0,
      "status": "done",
      "insightPoints": ["令 y=0 解方程得 A(-1,0)、B(3,0)", "顶点配方得 P(1,-4)"]
    },
    {
      "index": 1,
      "status": "blocked",
      "insightPoints": [],
      "blockedHint": "利用坐标计算底 AB 长与 P 到 x 轴高度，套面积公式"
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
