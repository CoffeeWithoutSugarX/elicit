import { describe, it, expect } from 'vitest';
import { phaseSignalParse } from '@/agents/nodes/algorithm/phaseSignalParse';

describe('phaseSignalParse', () => {
  // ── 基础信号解析 ──────────────────────────────────────────────

  it('解析 COMPLETED 信号', () => {
    const result = phaseSignalParse('不错。\nphase_signal: "COMPLETED"');
    expect(result.signal).toBe('COMPLETED');
  });

  it('解析 STAY 信号', () => {
    const result = phaseSignalParse('继续思考。\nphase_signal: "STAY"');
    expect(result.signal).toBe('STAY');
  });

  it('解析 ESCALATE 信号', () => {
    const result = phaseSignalParse('需要升级。\nphase_signal: "ESCALATE"');
    expect(result.signal).toBe('ESCALATE');
  });

  it('解析 SUB_PROBLEM_DONE 信号', () => {
    const result = phaseSignalParse('子问题完成。\nphase_signal: "SUB_PROBLEM_DONE"');
    expect(result.signal).toBe('SUB_PROBLEM_DONE');
  });

  it('解析 PROBLEM_BLOCKED 信号', () => {
    const result = phaseSignalParse('问题卡住了。\nphase_signal: "PROBLEM_BLOCKED"');
    expect(result.signal).toBe('PROBLEM_BLOCKED');
  });

  // ── 缺失或无效信号的 fallback ──────────────────────────────────

  it('缺少 phase_signal 时默认返回 STAY', () => {
    const result = phaseSignalParse('这是普通回复，没有任何 signal 行。');
    expect(result.signal).toBe('STAY');
  });

  it('phase_signal 缺少引号（格式错误）时返回 STAY', () => {
    // 正则要求值被双引号包裹，这里没有引号，不应匹配
    const result = phaseSignalParse('phase_signal: COMPLETED');
    expect(result.signal).toBe('STAY');
  });

  it('phase_signal 值为未知枚举时返回 STAY', () => {
    const result = phaseSignalParse('phase_signal: "INVALID"');
    expect(result.signal).toBe('STAY');
  });

  // ── 附加字段提取 ───────────────────────────────────────────────

  it('提取 probed_question_id', () => {
    const result = phaseSignalParse('提示。\nprobed_question_id: 3\nphase_signal: "STAY"');
    expect(result.probedQuestionId).toBe(3);
    expect(result.signal).toBe('STAY');
  });

  it('提取 new_insight', () => {
    const result = phaseSignalParse('好的。\nnew_insight: "对称变换"\nphase_signal: "STAY"');
    expect(result.newInsight).toBe('对称变换');
  });

  // ── 优先级：多 signal 取最高优先 ──────────────────────────────

  it('多个 signal 时 SUB_PROBLEM_DONE 优先于 COMPLETED', () => {
    const raw = '主体内容。\nphase_signal: "COMPLETED"\nphase_signal: "SUB_PROBLEM_DONE"';
    const result = phaseSignalParse(raw);
    expect(result.signal).toBe('SUB_PROBLEM_DONE');
  });

  // ── new_insight 截断 ──────────────────────────────────────────

  it('new_insight 超过 30 字符时截断为 30 字符', () => {
    const longInsight = 'a'.repeat(40);
    const result = phaseSignalParse(`phase_signal: "STAY"\nnew_insight: "${longInsight}"`);
    expect(result.newInsight).toHaveLength(30);
  });

  // ── cleanContent 剔除协议行 ───────────────────────────────────

  it('cleanContent 不包含协议行', () => {
    const raw = '主要回答内容。\nphase_signal: "STAY"';
    const result = phaseSignalParse(raw);
    expect(result.cleanContent).toBe('主要回答内容。');
    expect(result.cleanContent).not.toContain('phase_signal');
  });

  it('cleanContent 同时剔除 probed_question_id 和 phase_signal 行', () => {
    const raw = '引导内容。\nprobed_question_id: 2\nphase_signal: "STAY"';
    const result = phaseSignalParse(raw);
    expect(result.cleanContent).toBe('引导内容。');
    expect(result.cleanContent).not.toContain('probed_question_id');
    expect(result.cleanContent).not.toContain('phase_signal');
  });

  it('非协议行夹在协议行之间时，只剔除尾部连续协议行', () => {
    const raw = '主要内容\nphase_signal: "STAY"\n一些正常文本\nprobed_question_id: 2';
    const result = phaseSignalParse(raw);
    // 只有尾部的 probed_question_id 行被剔除（连续协议行到第一个非协议行为止）
    expect(result.cleanContent).toContain('一些正常文本');
    expect(result.cleanContent).toContain('phase_signal');
    expect(result.probedQuestionId).toBe(2);
  });
});
