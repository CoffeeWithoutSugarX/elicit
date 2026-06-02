import { describe, it, expect } from 'vitest';
import { OcrPrompt } from '@/agents/prompts/vision/OcrPrompt';

describe('OcrPrompt', () => {
    it('is exported as a non-empty string', () => {
        expect(typeof OcrPrompt).toBe('string');
        expect(OcrPrompt.trim().length).toBeGreaterThan(0);
    });

    it('contains the two mode identifiers DETECT and ANALYZE', () => {
        expect(OcrPrompt).toContain('DETECT');
        expect(OcrPrompt).toContain('ANALYZE');
    });

    it('contains the Pólya phase labels used for milestone tagging', () => {
        expect(OcrPrompt).toContain('Decoding');
        expect(OcrPrompt).toContain('Mapping');
        expect(OcrPrompt).toContain('Executing');
        expect(OcrPrompt).toContain('Reviewing');
    });

    it('describes the three hint levels L1, L2, L3', () => {
        expect(OcrPrompt).toContain('L1');
        expect(OcrPrompt).toContain('L2');
        expect(OcrPrompt).toContain('L3');
    });

    it('references the JSON output schema fields isSolvable and milestones', () => {
        expect(OcrPrompt).toContain('isSolvable');
        expect(OcrPrompt).toContain('milestones');
    });

    it('includes the strict-JSON output instruction (no markdown code fences in output)', () => {
        expect(OcrPrompt).toContain('纯净的 JSON');
    });

    it('references mode_executed in the output schema', () => {
        expect(OcrPrompt).toContain('mode_executed');
    });

    it('contains the fullSolutionLecture field for escape-hatch mode', () => {
        expect(OcrPrompt).toContain('fullSolutionLecture');
    });
});
