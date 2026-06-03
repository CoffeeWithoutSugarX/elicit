import { z } from 'zod';
import { OcrSchema } from '@/agents/schemas/OcrSchema';

// ——— 系统提示词 ———
export const systemPrompt = `你是一个数学题图片识别助手。任务：

1. 识别图中**所有**数学题（最多 5 题），按从上到下、从左到右出现的顺序排列。
2. 对每道题提取：题目文本（含 LaTeX 公式）+ 已知条件 + 隐含条件 + 求解目标 + 粗粒度解题里程碑（最多 4 个，不给具体步骤数值）。
3. 对**每道题**进一步拆分小问（B4 新增 / FR-VISION-001 / 详设 §15 D13）：若题目含明确编号小问（如 (1)(2)(3) 或 ① ②）则按编号拆分到 \`subProblems[]\`，每个小问给 \`goal\` + \`givenConditions\` + \`milestones\`；若是单一目标题（无编号小问）则输出 \`subProblems\` 长度=1，内容即为整题的 goal。
4. **判定本题是否"必须依赖图"**（visualFeaturesNeeded）：题面文字不足以表达解题所需信息、必须看图才能解的题（如函数图像 / 统计图表 / 含未在文字中标注的几何图形）= true；纯文字 + 公式即可解的题（即便配了示意图）= false。
5. **对 \`visualFeaturesNeeded=true\` 的题，必须输出 \`visualDescription\` 字符串**（自然语言结构化描述），覆盖**关键视觉特征 checklist**（R-011 落地）；DeepSeek 文本模型看不到原图，**只能从你的 visualDescription 还原图意**——漏写任一关键特征会导致下游引导偏离题意。\`false\` 时 \`visualDescription\` 留空字符串。
6. 整张图整体学科判断（若有非数学题混入，subject 取实际学科）。

【visualDescription 的关键视觉特征 checklist】——按题型类别覆盖：

- **函数图像题**（抛物线 / 双曲线 / 直线 / 分段函数等）：
  · 图像类型（直线 / 抛物线开口向上 or 下 / 双曲线在哪两个象限）
  · 与坐标轴交点（如"过原点"/"x 轴交于 A(-1,0) 和 B(3,0)"/"y 轴交于 (0,-3)"）
  · 关键点坐标（顶点 / 拐点 / 极值点 / 已标注的点）
  · 对称轴 / 渐近线（若有）位置
  · 图像间相对关系（多函数同图时：交点个数 / 大小关系 / 包含关系）
- **几何图形题**（不在文字中重复标注的图形信息）：
  · 图形类型（三角形 / 四边形 / 圆等）+ 关键标记（直角小方块 / 等长刻度线 / 平行箭头）
  · 顶点字母标注 + 顶点间相对位置（如"D 是 BC 中点"/"E 在 AB 延长线上"）
  · 角度标注 / 边长标注 / 圆心 / 切点
  · 辅助线已画出的位置（如有）
- **统计图表题**（柱状图 / 折线图 / 扇形图 / 表格）：
  · 图表类型 + 横纵轴含义 + 刻度单位
  · 每一组数据的关键值（如"语文 85 / 数学 92 / 英语 78"或"前三个月递增、第四个月下降"）
  · 图例 / 分类含义
  · 总数 / 百分比 / 比例关系（若可读出）
- **其他视觉信息**（数轴 / 网格图 / 立体图 / 展开图）：
  · 按"读图者眼中看到什么、文字没说的"为准描述

严格按以下 JSON 输出，不输出任何其他文字：

{
  "isSolvable": <boolean>,
  "subject": "math" | "chinese" | "english" | "physics" | "chemistry" | "biology" | "history" | "geography" | "politics" | "other",
  "grade": "小学" | "初中" | "高中" | "其他" | null,
  "questions": [
    {
      "index": <0-based 序号>,
      "topic": <string, 尽量简短，建议 30 字内；超出会被自动截断，请尽量精炼>,
      "latexFull": <string, 原题完整 LaTeX>,
      "givenConditions": <string[]>,
      "implicitConditions": <string[]>,
      "goal": <string, 尽量简短，建议 30 字内；超出会被自动截断，请尽量精炼>,
      "milestones": <string[], 建议不超过 4 条；超出会被自动截断>,
      "visualFeaturesNeeded": <boolean>,
      "visualDescription": <string, visualFeaturesNeeded=true 时必填 ≥30 字按 checklist 覆盖；false 时 "">,
      "subProblems": [
        {
          "index": <0-based 序号>,
          "goal": <string, 尽量简短，建议 50 字内；超出会被自动截断，请尽量精炼>,
          "givenConditions": <string[]>,
          "milestones": <string[], 建议不超过 4 条；超出会被自动截断>
        }
      ]
    }
  ],
  "isMulti": <boolean>,
  "visualFeaturesNeeded": <boolean>,
  "errorReason": "BLURRY" | "NOT_SOLVABLE" | null
}

约束：
- questions 长度 1~5；超过 5 题只识别前 5 题
- 单题图：questions 数组长度 = 1，isMulti = false
- 多题图：questions 长度 ≥ 2，isMulti = true，按出现顺序排序
- 每题 subProblems 长度 1~5：单一目标题 length=1（即整题的 goal）；含 (1)(2)(3) 编号小问的题 length 2~5；超过 5 小问截断
- 区分"递进小问"（如 "(1) 求 AB 长 (2) 在 (1) 基础上算 △ABC 面积"）vs "看似多小问但实为一题"（如 "求 m 的范围，并验证 m=2"——只算 1 个 subProblem）
- **顶层 \`visualFeaturesNeeded\` = 任一题的 \`visualFeaturesNeeded\` 为 true 时为 true**（兼容老版本下游 reader）
- **每题独立标 \`visualFeaturesNeeded\` + \`visualDescription\`**：多题图中可能只有部分题依赖图（如第 1 题文字题、第 2 题函数图像题），只给依赖图的那题写 \`visualDescription\`
- visualDescription 写法：客观描述图中所见，不预判解法 / 不给数值答案；用"图中所示"/"图像显示"等中性表述
- 非数学题：isSolvable=false, subject 填实际学科, questions=[]
- 整张图模糊不可读：isSolvable=false, errorReason="BLURRY", questions=[]
- LaTeX 必须用 $...$ 或 $$...$$ 包裹
- 不要给具体解答 / 数值答案`;

// ——— 用户提示词模板 ———
export interface VisionNodeInput {
    imgUrl: string;
    userText?: string;
}

export function userPromptTemplate({ imgUrl, userText }: VisionNodeInput): string {
    return `图片 URL：${imgUrl}\n${userText ? `妹妹的补充：${userText}` : ''}`;
}

// ——— 输出契约（沿用 OcrSchema） ———
export const outputContract = OcrSchema;

// ——— few-shots ———
// 3 组覆盖：纯文字代数题 / 函数图像题 / 几何辅助线题
export const fewShots: ReadonlyArray<{ user: string; assistant: string }> = [
    {
        // fixture 1 — 纯文字代数题（visualFeaturesNeeded=false）
        user: '图片 URL：https://example.com/algebra-only.jpg\n',
        assistant: JSON.stringify({
            isSolvable: true,
            subject: 'math',
            grade: '初中',
            questions: [
                {
                    index: 0,
                    topic: '一元二次方程的实根判别',
                    latexFull: '已知方程 $x^2 - 4x + m = 0$ 有两个实数根，求 $m$ 的取值范围。',
                    givenConditions: ['方程 $x^2 - 4x + m = 0$ 有两个实数根'],
                    implicitConditions: ['$\\Delta \\ge 0$'],
                    goal: '求 m 的取值范围',
                    milestones: ['写出判别式 Δ', '建立关于 m 的不等式', '解不等式'],
                    visualFeaturesNeeded: false,
                    visualDescription: '',
                    subProblems: [
                        {
                            index: 0,
                            goal: '求 m 的取值范围',
                            givenConditions: ['方程有两实根'],
                            milestones: ['计算 Δ', '建立不等式', '解不等式'],
                        },
                    ],
                },
            ],
            isMulti: false,
            visualFeaturesNeeded: false,
            errorReason: null,
        }, null, 2),
    },
    {
        // fixture 2 — 函数图像题（含 visualDescription 覆盖图像类型 + 交点 + 顶点 + 对称轴）
        user: '图片 URL：https://example.com/parabola-function.jpg\n',
        assistant: JSON.stringify({
            isSolvable: true,
            subject: 'math',
            grade: '初中',
            questions: [
                {
                    index: 0,
                    topic: '二次函数图像综合（面积）',
                    latexFull: '已知抛物线 $y = x^2 - 2x - 3$ 与 $x$ 轴交于点 $A$、$B$，顶点为 $P$。(1) 求 $A$、$B$、$P$ 的坐标；(2) 求 $\\triangle PAB$ 的面积。',
                    givenConditions: ['$y = x^2 - 2x - 3$ 与 $x$ 轴交于 $A$、$B$'],
                    implicitConditions: ['顶点 $P$ 在抛物线上'],
                    goal: '(1) 求 A、B、P 坐标；(2) 求 △PAB 面积',
                    milestones: ['解方程 $x^2-2x-3=0$ 求 A、B', '用顶点公式求 P', '面积公式计算'],
                    visualFeaturesNeeded: true,
                    visualDescription: '图中所示为开口向上的抛物线 $y=x^2-2x-3$，与 $x$ 轴交于 $A$、$B$ 两点，$A$ 在 $y$ 轴左侧、$B$ 在 $y$ 轴右侧；与 $y$ 轴交于点 $(0,-3)$；顶点 $P$ 在 $x$ 轴下方、对称轴 $x=1$ 上；图中 $A$、$B$、$P$ 三点构成倒置三角形 $\\triangle PAB$。',
                    subProblems: [
                        {
                            index: 0,
                            goal: '求 A、B、P 的坐标',
                            givenConditions: ['$y = x^2 - 2x - 3$ 与 $x$ 轴交于 $A$、$B$'],
                            milestones: ['解方程 $x^2-2x-3=0$', '顶点配方'],
                        },
                        {
                            index: 1,
                            goal: '求 △PAB 的面积',
                            givenConditions: ['A、B、P 坐标已知'],
                            milestones: ['底 = AB 长', '高 = P 到 x 轴距离', '面积公式'],
                        },
                    ],
                },
            ],
            isMulti: false,
            visualFeaturesNeeded: true,
            errorReason: null,
        }, null, 2),
    },
    {
        // fixture 3 — 几何辅助线题（含 visualDescription 覆盖图形 + 顶点 + 角度标注 + 辅助线）
        user: '图片 URL：https://example.com/triangle-midline.jpg\n',
        assistant: JSON.stringify({
            isSolvable: true,
            subject: 'math',
            grade: '初中',
            questions: [
                {
                    index: 0,
                    topic: '三角形中线与面积关系',
                    latexFull: '在 $\\triangle ABC$ 中，$D$ 是 $BC$ 的中点，$AD$ 是中线，$AD \\perp BC$。求证 $\\triangle ABD \\cong \\triangle ACD$。',
                    givenConditions: ['$D$ 是 $BC$ 中点', '$AD \\perp BC$'],
                    implicitConditions: ['$BD = DC$（D 是中点）'],
                    goal: '证明 △ABD ≅ △ACD',
                    milestones: ['确认公共边 AD', '利用 BD=DC 和 ∠ADB=∠ADC=90°', 'SAS 或 SSS 全等'],
                    visualFeaturesNeeded: true,
                    visualDescription: '图中所示为 $\\triangle ABC$，顶点 $A$ 在上方，$B$ 在左下、$C$ 在右下；$D$ 是 $BC$ 的中点，图中 $BD$ 和 $DC$ 处标有等长刻度线；$AD$ 为从 $A$ 到 $D$ 的线段，$D$ 处标有直角小方块表示 $AD \\perp BC$；图中已画出辅助线 $AD$（中线）。',
                    subProblems: [
                        {
                            index: 0,
                            goal: '证明 △ABD ≅ △ACD',
                            givenConditions: ['D 是 BC 中点', 'AD ⊥ BC'],
                            milestones: ['确认 AD 公共边', '利用 BD=DC', '利用直角条件', '写全等证明'],
                        },
                    ],
                },
            ],
            isMulti: false,
            visualFeaturesNeeded: true,
            errorReason: null,
        }, null, 2),
    },
] as const;

// ——— 模型参数 ———
// 使用 qwen3-vl-plus（Qwen3-VL 代视觉模型），不用 DeepSeek
export const modelParams = {
    temperature: 0.0,
    max_tokens: 1024,
    streaming: false,
} as const;
