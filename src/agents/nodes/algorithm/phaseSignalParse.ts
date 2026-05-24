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

const SIGNAL_REGEX  = /^phase_signal:\s*"(COMPLETED|STAY|ESCALATE|SUB_PROBLEM_DONE|PROBLEM_BLOCKED)"/;
const PROBED_REGEX  = /^probed_question_id:\s*([1-5])/;
const INSIGHT_REGEX = /^new_insight:\s*"(.+?)"/;

export function phaseSignalParse(rawContent: string): PhaseSignalParseResult {
  const lines         = rawContent.split('\n');
  const reversedLines = [...lines].reverse();

  const signals: PhaseSignal[]             = [];
  let probedQuestionId: 1 | 2 | 3 | 4 | 5 | undefined;
  let newInsight: string | undefined;
  let dropLineCount = 0;

  for (let i = 0; i < Math.min(reversedLines.length, 5); i++) {
    const line = reversedLines[i].trim();

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
  }

  const signal = signals.length > 0
    ? signals.sort((a, b) => SIGNAL_PRIORITY[b] - SIGNAL_PRIORITY[a])[0]
    : 'STAY';

  if (signals.length > 1) {
    console.warn(
      `[phaseSignalParse] Multiple signals detected: ${signals.join(', ')}. Using highest priority: ${signal}`,
    );
  }

  const cleanContent = dropLineCount > 0
    ? lines.slice(0, lines.length - dropLineCount).join('\n').trim()
    : rawContent.trim();

  return { signal, probedQuestionId, newInsight, cleanContent };
}
