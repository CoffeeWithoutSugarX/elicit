// P-001 学情知识边界 — 验证 5 个 prompt 的 systemPrompt 均已注入学情块
// 并验证 reviewNode few-shots 不再含旧的错误 textbookRef

import { describe, it, expect, vi } from 'vitest';

// ——— mock studentProfile（避免读取真实 env）———
vi.mock('@/agents/data/studentProfile', () => ({
    studentGradeTerm: '7B',
}));

// 注意：studentContext 依赖 bsdMathCatalog（纯数据），无需 mock
// loadKnowledgePoints 在 reviewNode.prompt 里通过 userPromptTemplate 使用，systemPrompt 不直接引用，无需 mock

import { systemPrompt as visionSystemPrompt } from '@/agents/prompts/vision/visionNode.prompt';
import { systemPrompt as understandSystemPrompt } from '@/agents/prompts/phases/understandNode.prompt';
import { systemPrompt as planSystemPrompt } from '@/agents/prompts/phases/planNode.prompt';
import { systemPrompt as executeSystemPrompt } from '@/agents/prompts/phases/executeNode.prompt';
import { systemPrompt as reviewSystemPrompt, fewShots as reviewFewShots } from '@/agents/prompts/phases/reviewNode.prompt';

describe('P-001 prompt 注入：5 个 systemPrompt 含学情块', () => {
    const MARKER = '知识边界 — 硬约束';

    it('visionNode.systemPrompt 含学情块标志文本', () => {
        expect(visionSystemPrompt).toContain(MARKER);
    });

    it('understandNode.systemPrompt 含学情块标志文本', () => {
        expect(understandSystemPrompt).toContain(MARKER);
    });

    it('planNode.systemPrompt 含学情块标志文本', () => {
        expect(planSystemPrompt).toContain(MARKER);
    });

    it('executeNode.systemPrompt 含学情块标志文本', () => {
        expect(executeSystemPrompt).toContain(MARKER);
    });

    it('reviewNode.systemPrompt 含学情块标志文本', () => {
        expect(reviewSystemPrompt).toContain(MARKER);
    });

    it('visionNode.systemPrompt 含解题路线知识边界硬约束说明', () => {
        expect(visionSystemPrompt).toContain('解题路线必须以【已学完/正在学】清单内的知识可完成为目标设计');
    });

    it('所有 phase prompt 含「严禁主动引入未学概念/术语」', () => {
        const RULE = '严禁主动引入未学概念/术语';
        expect(understandSystemPrompt).toContain(RULE);
        expect(planSystemPrompt).toContain(RULE);
        expect(executeSystemPrompt).toContain(RULE);
        expect(reviewSystemPrompt).toContain(RULE);
    });

    it('所有 systemPrompt 含宽容条款', () => {
        const TOLERANCE = '宽容条款';
        expect(visionSystemPrompt).toContain(TOLERANCE);
        expect(understandSystemPrompt).toContain(TOLERANCE);
        expect(planSystemPrompt).toContain(TOLERANCE);
        expect(executeSystemPrompt).toContain(TOLERANCE);
        expect(reviewSystemPrompt).toContain(TOLERANCE);
    });
});

describe('P-001 reviewNode few-shots 修正', () => {
    it('fixture 1 不再含「八年级上 §5.3」（旧错误引用）', () => {
        const fixture1 = reviewFewShots[0];
        expect(fixture1.user).not.toContain('八年级上 §5.3');
        expect(fixture1.assistant).not.toContain('八年级上 §5.3');
    });

    it('fixture 1 是七下水平几何题（含「全等三角形」或「轴对称」）', () => {
        const fixture1 = reviewFewShots[0];
        const hasGeometry =
            fixture1.user.includes('全等三角形') ||
            fixture1.user.includes('轴对称') ||
            fixture1.assistant.includes('全等三角形') ||
            fixture1.assistant.includes('轴对称');
        expect(hasGeometry).toBe(true);
    });

    it('fixture 1 证明为干净纲内路线（含「三线合一」，无循环论证笔误「∠AOM=∠AOM」）', () => {
        const fixture1 = reviewFewShots[0];
        expect(fixture1.user).toContain('三线合一');
        expect(fixture1.assistant).toContain('三线合一');
        // 旧版本破题点 2 的笔误，确保已清除
        expect(fixture1.user).not.toContain('∠AOM=∠AOM');
    });

    it('fixture 1 textbookRef 逐字取自 CSV 出处列（含「七下 §4.2-4.3」「七下 §5」，无「北师大」前缀）', () => {
        const fixture1 = reviewFewShots[0];
        expect(fixture1.assistant).toContain('"textbookRef": "七下 §4.2-4.3"');
        expect(fixture1.assistant).toContain('"textbookRef": "七下 §5"');
        expect(fixture1.assistant).not.toContain('北师大');
    });

    it('fixture 2 整组为七下整式乘除题材（含「平方差」），textbookRef 为「七下 §1」', () => {
        const fixture2 = reviewFewShots[1];
        expect(fixture2.user).toContain('整式');
        expect(fixture2.assistant).toContain('平方差');
        expect(fixture2.assistant).toContain('"textbookRef": "七下 §1"');
    });

    it('fixture 2 不再含九下二次函数题材（无「二次函数」「九下 §2」「九年级上 §3.2」）', () => {
        const fixture2 = reviewFewShots[1];
        expect(fixture2.assistant).not.toContain('二次函数');
        expect(fixture2.assistant).not.toContain('九下 §2');
        expect(fixture2.user).not.toContain('九年级上 §3.2');
        expect(fixture2.assistant).not.toContain('九年级上 §3.2');
    });

    it('两个 fixture 的 assistant 输出均不含「北师大」前缀（textbookRef 格式统一）', () => {
        reviewFewShots.forEach((shot, i) => {
            expect(shot.assistant, `fixture ${i + 1}`).not.toContain('北师大');
        });
    });

    it('两个 fixture 都包含 phase_signal: "COMPLETED"', () => {
        reviewFewShots.forEach((shot, i) => {
            expect(shot.assistant, `fixture ${i + 1}`).toContain('phase_signal: "COMPLETED"');
        });
    });

    it('两个 fixture 都包含合法的 JSON 围栏', () => {
        reviewFewShots.forEach((shot, i) => {
            expect(shot.assistant, `fixture ${i + 1}`).toMatch(/```json[\s\S]*?```/);
        });
    });
});
