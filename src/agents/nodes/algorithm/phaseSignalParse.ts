export type PhaseSignal =
  | 'COMPLETED'
  | 'STAY'
  | 'ESCALATE'
  | 'SUB_PROBLEM_DONE'
  | 'PROBLEM_BLOCKED';

export interface PhaseSignalParseResult {
  signal: PhaseSignal;
  probedQuestionId?: 1 | 2 | 3 | 4 | 5;
  newInsight?: string;
  cleanContent: string;
}

const SIGNAL_PRIORITY: Record<PhaseSignal, number> = {
  'SUB_PROBLEM_DONE': 5,
  'PROBLEM_BLOCKED':  4,
  'ESCALATE':         3,
  'COMPLETED':        2,
  'STAY':             1,
};

const VALID_SIGNALS = new Set<string>([
  'COMPLETED', 'STAY', 'ESCALATE', 'SUB_PROBLEM_DONE', 'PROBLEM_BLOCKED',
]);

// 正则说明：
//   - 冒号仅匹配半角 `:`（全角 `：` 不属于协议格式，防误判）
//   - 双引号改为可选 `"?`，兼容 DeepSeek 实际输出的无引号格式
//   - 信号值枚举仍严格大写匹配，不接受小写或未知词
//   - 行尾允许多余空白（\s*$）
const SIGNAL_REGEX  = /^phase_signal:\s*"?(COMPLETED|STAY|ESCALATE|SUB_PROBLEM_DONE|PROBLEM_BLOCKED)"?\s*$/;
const PROBED_REGEX  = /^probed_question_id:\s*([1-5])\s*$/;
// new_insight 值部分：引号可选，贪婪匹配到行尾（去掉可能存在的尾部引号）
const INSIGHT_REGEX = /^new_insight:\s*"?(.+?)"?\s*$/;

// 逆序扫描窗口放宽到 8 行，为夹杂空行的场景留出余量
const SCAN_WINDOW = 8;

export function phaseSignalParse(rawContent: string): PhaseSignalParseResult {
  const lines         = rawContent.split('\n');
  const reversedLines = [...lines].reverse();

  const signals: PhaseSignal[]             = [];
  let probedQuestionId: 1 | 2 | 3 | 4 | 5 | undefined;
  let newInsight: string | undefined;
  // dropLineCount 记录从末尾需要丢弃的行数（含空行）
  let dropLineCount = 0;

  for (let i = 0; i < Math.min(reversedLines.length, SCAN_WINDOW); i++) {
    const line = reversedLines[i].trim();

    // 空行：跳过，不计为协议行，也不终止扫描
    // cleanContent 最终有 trim() 兜底，空行残留不影响展示
    if (line === '') {
      // 若当前 dropLineCount 恰好覆盖到此行位置，则将其也纳入丢弃范围，
      // 避免正文末尾混入空行。条件：dropLineCount 已经在此行之后（即后续有协议行命中）
      if (dropLineCount > 0) {
        dropLineCount = Math.max(dropLineCount, i + 1);
      }
      continue;
    }

    const signalMatch = line.match(SIGNAL_REGEX);
    if (signalMatch && VALID_SIGNALS.has(signalMatch[1])) {
      signals.push(signalMatch[1] as PhaseSignal);
      dropLineCount = Math.max(dropLineCount, i + 1);
      continue;
    }

    const probedMatch = line.match(PROBED_REGEX);
    if (probedMatch) {
      probedQuestionId  = +probedMatch[1] as 1 | 2 | 3 | 4 | 5;
      dropLineCount     = Math.max(dropLineCount, i + 1);
      continue;
    }

    const insightMatch = line.match(INSIGHT_REGEX);
    if (insightMatch) {
      newInsight    = insightMatch[1].slice(0, 30);
      dropLineCount = Math.max(dropLineCount, i + 1);
      continue;
    }

    // 遇到非空、非协议行则停止扫描，避免跳过中间正文内容
    break;
  }

  const signal = signals.length > 0
    ? signals.sort((a, b) => SIGNAL_PRIORITY[b] - SIGNAL_PRIORITY[a])[0]
    : 'STAY';

  if (signals.length > 1) {
    console.warn(
      `[phaseSignalParse] Multiple signals detected: ${signals.join(', ')}. Using highest priority: ${signal}`,
    );
  }

  // 输出非空但一条协议行都未命中时，打印观测日志（便于排查模型格式漂移）
  if (signals.length === 0 && rawContent.trim().length > 0 && probedQuestionId === undefined && newInsight === undefined) {
    console.warn('[phaseSignalParse] no protocol line matched, defaulting to STAY');
  }

  const cleanContent = dropLineCount > 0
    ? lines.slice(0, lines.length - dropLineCount).join('\n').trim()
    : rawContent.trim();

  return { signal, probedQuestionId, newInsight, cleanContent };
}
