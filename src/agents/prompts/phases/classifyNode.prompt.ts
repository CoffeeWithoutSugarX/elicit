import { z } from 'zod';
import { formatVisualBlock } from './_shared';
import type { SanitizedQuestion } from '@/agents/schemas/OcrSchema';

// ——— 系统提示词 ———
export const systemPrompt = `你是初中数学题型分类器。输入是已识别的题目（含已知条件 + 求解目标 + LaTeX），请按以下规则输出题型 code：

0 = 代数：方程 / 不等式 / 因式分解 / 分式运算 / 设元列方程的应用题
1 = 几何：三角形 / 四边形 / 圆 / 全等 / 相似 / 辅助线 / 面积体积
2 = 函数：一次/二次/反比例函数 / 函数图像 / 待定系数法 / 函数与方程不等式综合
3 = 其他：兜底，统计概率 / 数与代数中无法归到 0/1/2 的杂项

判定优先级（如有多重特征）：函数 > 几何 > 代数。即"含 y=f(x) 或函数图像" → 2；其余有几何元素 → 1；其余 → 0；都不像 → 3。

严格按以下 JSON 输出，不输出任何其他文字：

{
  "problemType": <0 | 1 | 2 | 3>,
  "reason": <string, ≤30 字>
}`;

// ——— 用户提示词模板 ———
// v0.1.1：注入 visualDescription，含图题型判定依赖图意
export interface ClassifyNodeInput {
    selectedQuestion: SanitizedQuestion;
}

export function userPromptTemplate({ selectedQuestion }: ClassifyNodeInput): string {
    const visual = formatVisualBlock(selectedQuestion);
    return `题目：${selectedQuestion.topic}
LaTeX：${selectedQuestion.latexFull}
目标：${selectedQuestion.goal}

${visual}`;
}

// ——— 输出契约 ———
export const outputContract = z.object({
    problemType: z.union([
        z.literal(0),
        z.literal(1),
        z.literal(2),
        z.literal(3),
    ]),
    reason: z.string().max(30),
});

// ——— few-shots ———
// 4 组覆盖：代数 / 几何 / 函数 / 含图函数（视觉特征驱动分类）
export const fewShots: ReadonlyArray<{ user: string; assistant: string }> = [
    {
        // fixture 1 — 代数题
        user: `题目：一元二次方程的实根判别
LaTeX：已知方程 $x^2 - 4x + m = 0$ 有两个实数根，求 $m$ 的取值范围。
目标：求 m 的取值范围

`,
        assistant: JSON.stringify({ problemType: 0, reason: '出现二次方程 + 求参数取值，归代数题' }),
    },
    {
        // fixture 2 — 几何题
        user: `题目：三角形中线与全等证明
LaTeX：在 $\\triangle ABC$ 中，$D$ 是 $BC$ 的中点，$AD \\perp BC$，证明 $\\triangle ABD \\cong \\triangle ACD$。
目标：证明 △ABD ≅ △ACD

`,
        assistant: JSON.stringify({ problemType: 1, reason: '三角形全等证明，含中线与垂直关系，归几何题' }),
    },
    {
        // fixture 3 — 函数题（纯文字，无图）
        user: `题目：二次函数顶点与对称轴
LaTeX：已知 $y = x^2 - 2x - 3$，求顶点坐标和对称轴。
目标：求顶点和对称轴

`,
        assistant: JSON.stringify({ problemType: 2, reason: '含二次函数 y=f(x) 求图像特征，归函数题' }),
    },
    {
        // fixture 4 — 含图函数题（visualDescription 中含"抛物线"触发函数分类）
        user: `题目：二次函数图像综合（面积）
LaTeX：已知抛物线 $y = x^2 - 2x - 3$ 与 $x$ 轴交于点 $A$、$B$，顶点为 $P$，求 $\\triangle PAB$ 的面积。
目标：求 △PAB 面积

# 题目图示（妹妹看到的图，你看不到，按下方描述还原图意进行引导，不要假设描述外的视觉信息）
图中所示为开口向上的抛物线 $y=x^2-2x-3$，与 $x$ 轴交于 $A$、$B$ 两点，$A$ 在 $y$ 轴左侧、$B$ 在 $y$ 轴右侧；与 $y$ 轴交于点 $(0,-3)$；顶点 $P$ 在 $x$ 轴下方、对称轴 $x=1$ 上。`,
        assistant: JSON.stringify({ problemType: 2, reason: '含函数图像（抛物线 + 交点 + 顶点），优先归函数题' }),
    },
] as const;

// ——— 模型参数 ———
export const modelParams = {
    temperature: 0.0,
    max_tokens: 256,
    streaming: false,
} as const;
