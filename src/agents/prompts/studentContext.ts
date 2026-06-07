// P-001 学情知识边界 — 学情块生成函数
// 供 visionNode / understandNode / planNode / executeNode / reviewNode 的 systemPrompt 注入使用
// 纯函数，不读 env，调用方传 gradeTerm（由 studentProfile.studentGradeTerm 提供）

import { BSD_MATH_CATALOG, confusionNotes, GRADE_TERMS, type GradeTerm } from '@/agents/data/bsdMathCatalog';

/**
 * 生成学情块文本（≤400 token），供注入各 phase prompt 的 systemPrompt。
 * 截断语义：
 *   index < currentIdx → 已学完
 *   index === currentIdx → 正在学
 *   index > currentIdx → 未学
 */
export function buildStudentContext(gradeTerm: GradeTerm): string {
    const currentIdx = GRADE_TERMS.indexOf(gradeTerm);

    const doneCatalogs = BSD_MATH_CATALOG.filter((_, i) => i < currentIdx);
    const currentCatalog = BSD_MATH_CATALOG[currentIdx];
    const futureCatalogs = BSD_MATH_CATALOG.filter((_, i) => i > currentIdx);

    // ——— 已学完段（只列章标题，顿号连接；不列节名，省 token）———
    let doneSection = '';
    if (doneCatalogs.length > 0) {
        const lines = doneCatalogs.map(tc => {
            const chapterTitles = tc.chapters.map(ch => ch.title).join('、');
            return `${tc.label}：${chapterTitles}`;
        });
        doneSection = `【已学完】\n${lines.join('\n')}`;
    }

    // ——— 正在学段（章标题 + 节名全列；题目主要来自当前学期，需要节级细节）———
    const currentChaptersSummary = currentCatalog.chapters
        .map(ch => {
            const secs = ch.sections.join('/');
            return `${ch.title}（${secs}）`;
        })
        .join('；');
    const currentSection = `【正在学】\n${currentCatalog.label}：${currentChaptersSummary}（本学期靠后章节可能未学到，优先使用更早内容）`;

    // ——— 未学段（只列学期标签，省 token；语义为「禁用」清单，无需精确章名）———
    let futureSection = '';
    if (futureCatalogs.length > 0) {
        const labels = futureCatalogs.map(tc => tc.label).join('、');
        futureSection = `【未学，严禁在引导与解题路线中使用】\n${labels}（及其后续学期的全部内容）`;
    }

    // ——— 易混点段 ———
    const confusionSection = `【易混点】\n${confusionNotes.map((note, i) => `${'①②③④⑤'[i] ?? `${i + 1}.`} ${note}`).join('\n')}`;

    // ——— 拼装完整学情块 ———
    const parts = [
        `# 学生学情（知识边界 — 硬约束）`,
        `妹妹使用北师大版初中数学教材（七~八年级为 2024 课标新版）。当前就读：${currentCatalog.label}。`,
        doneSection,
        currentSection,
        futureSection,
        confusionSection,
        `【宽容条款】若妹妹主动提出"未学"范围的方法且使用正确：顺势肯定，并点出已学知识内的等价做法，不要否定或强行拉回；但你自己严禁主动引入未学概念或术语。`,
        `【注意】系统少量示例对话中的题目可能超出当前学龄，仅演示回复格式，不构成知识范围授权。`,
    ].filter(Boolean);

    return parts.join('\n');
}
