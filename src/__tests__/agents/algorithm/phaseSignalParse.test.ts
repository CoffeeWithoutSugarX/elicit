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

  it('phase_signal 无引号仍可正常解析（DeepSeek 实际输出格式）', () => {
    // 正则已放宽为引号可选，无引号格式应正确匹配
    const result = phaseSignalParse('phase_signal: COMPLETED');
    expect(result.signal).toBe('COMPLETED');
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

  // ── 无引号格式（DeepSeek 实际输出，线上泄漏复现场景）────────────

  it('无引号信号：正文 + phase_signal: STAY', () => {
    // 复现 DeepSeek 实际输出：信号值不带双引号
    const result = phaseSignalParse('这是正文内容。\nphase_signal: STAY');
    expect(result.signal).toBe('STAY');
    expect(result.cleanContent).toBe('这是正文内容。');
    expect(result.cleanContent).not.toContain('phase_signal');
  });

  it('无引号 + probed 组合（线上泄漏复现场景）', () => {
    // 复现线上 bug：probed_question_id 和 phase_signal 均无引号，两行全部泄漏进正文
    const result = phaseSignalParse('这是正文内容。\nprobed_question_id: 1\nphase_signal: STAY');
    expect(result.signal).toBe('STAY');
    expect(result.probedQuestionId).toBe(1);
    expect(result.cleanContent).toBe('这是正文内容。');
    expect(result.cleanContent).not.toContain('probed_question_id');
    expect(result.cleanContent).not.toContain('phase_signal');
  });

  it('带引号信号（回归保障：现有格式仍然工作）', () => {
    const result = phaseSignalParse('正文。\nphase_signal: "COMPLETED"');
    expect(result.signal).toBe('COMPLETED');
    expect(result.cleanContent).toBe('正文。');
  });

  it('尾部有空行时仍能正常解析（末尾单换行）', () => {
    const result = phaseSignalParse('正文。\nphase_signal: "COMPLETED"\n');
    expect(result.signal).toBe('COMPLETED');
    expect(result.cleanContent).toBe('正文。');
  });

  it('尾部有多个空行时仍能正常解析', () => {
    const result = phaseSignalParse('正文。\nphase_signal: "COMPLETED"\n\n');
    expect(result.signal).toBe('COMPLETED');
    expect(result.cleanContent).toBe('正文。');
  });

  it('全角冒号不匹配，不会解析为协议行（防误判）', () => {
    // 全角冒号不属于协议行格式，应当当作普通正文
    const result = phaseSignalParse('正文。\nphase_signal：STAY');
    expect(result.signal).toBe('STAY'); // 默认 fallback
    expect(result.cleanContent).toContain('phase_signal：STAY'); // 不被剔除
  });

  it('无引号 new_insight：解析成功且截断逻辑不变', () => {
    // DeepSeek 实际可能输出无引号的 new_insight
    const result = phaseSignalParse('好的。\nnew_insight: 两边平方\nphase_signal: "STAY"');
    expect(result.newInsight).toBe('两边平方');
    expect(result.cleanContent).toBe('好的。');
    expect(result.cleanContent).not.toContain('new_insight');
  });

  it('无引号 new_insight 超过 30 字符时截断为 30 字符', () => {
    const longInsight = 'a'.repeat(40);
    const result = phaseSignalParse(`好的。\nnew_insight: ${longInsight}\nphase_signal: "STAY"`);
    expect(result.newInsight).toHaveLength(30);
  });

  it('协议行之间夹空行：两个协议行均被解析，正文干净', () => {
    // 逆序扫描遇到空行应跳过，而非 break
    const result = phaseSignalParse('这是正文。\nprobed_question_id: 2\n\nphase_signal: STAY');
    expect(result.signal).toBe('STAY');
    expect(result.probedQuestionId).toBe(2);
    expect(result.cleanContent).toBe('这是正文。');
    expect(result.cleanContent).not.toContain('probed_question_id');
    expect(result.cleanContent).not.toContain('phase_signal');
  });
});
