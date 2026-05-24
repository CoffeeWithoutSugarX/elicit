import { describe, it, expect } from 'vitest';

import { shouldOcr, ocrNodeName } from '@/agents/nodes/flow/OcrNode';
import { visionNodeName } from '@/agents/nodes/flow/VisionNode';
import { createMockState } from '@/__tests__/helpers/mockState';

// OcrNode 只做 re-export + shouldOcr 逻辑，无 server-only 依赖，无需额外 mock。
// VisionNode 本身不在此处被 invoke，仅导入常量，安全。

describe('OcrNode — shouldOcr', () => {
    // ── 1. 应当触发 OCR ───────────────────────────────────────────────────────

    it('hasResolved=false + questionImgUrl 存在 → 返回 [ocrNodeName]', () => {
        const state = createMockState({
            hasResolved: false,
            questionImgUrl: 'https://example.com/math.jpg',
        });
        const result = shouldOcr(state);
        expect(result).toEqual([ocrNodeName]);
    });

    // ── 2. 已解析，不需要 OCR ─────────────────────────────────────────────────

    it('hasResolved=true → 返回 []（即使有图片）', () => {
        const state = createMockState({
            hasResolved: true,
            questionImgUrl: 'https://example.com/math.jpg',
        });
        const result = shouldOcr(state);
        expect(result).toEqual([]);
    });

    // ── 3. 无图片 ─────────────────────────────────────────────────────────────

    it('questionImgUrl 为 undefined → 返回 []', () => {
        const state = createMockState({
            hasResolved: false,
            questionImgUrl: undefined,
        });
        const result = shouldOcr(state);
        expect(result).toEqual([]);
    });

    // ── 4. 两个条件都不满足 ───────────────────────────────────────────────────

    it('hasResolved=true + questionImgUrl=undefined → 返回 []', () => {
        const state = createMockState({
            hasResolved: true,
            questionImgUrl: undefined,
        });
        const result = shouldOcr(state);
        expect(result).toEqual([]);
    });
});

describe('OcrNode — 常量导出', () => {
    // ── ocrNodeName 与 visionNodeName 保持一致 ────────────────────────────────

    it('ocrNodeName === visionNodeName（向后兼容委托）', () => {
        expect(ocrNodeName).toBe(visionNodeName);
    });

    it('ocrNodeName 为 "visionNode"', () => {
        expect(ocrNodeName).toBe('visionNode');
    });
});
