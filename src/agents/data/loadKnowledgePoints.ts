import { readFileSync } from 'fs';
import { join } from 'path';
import { GRADE_TERMS, type GradeTerm } from './bsdMathCatalog';

export interface KnowledgePoint {
  id: string;
  name: string;
  aliases: string[];
  grade: string;
  textbookRef: string;
}

const csvPath = join(process.cwd(), 'src', 'agents', 'data', 'knowledge-points.csv');
const raw = readFileSync(csvPath, 'utf-8').replace(/^﻿/, '');

export const knowledgePoints: ReadonlyArray<KnowledgePoint> = raw
  .split('\n')
  .slice(1)
  .filter(line => line.trim())
  .map(line => {
    const [id, name, aliases, grade, textbookRef] = line.split(',').map(s => s.trim());
    return { id, name, aliases: aliases.split('/').map(s => s.trim()), grade, textbookRef };
  });

export const knowledgePointsCsv = raw;

// ——— P-001 学情过滤：按当前学期过滤知识点 CSV ———
// 学期序：七上 < 七下 < 八上 < 八下 < 九上 < 九下（与 GRADE_TERMS 顺序一致）
// CSV 中年级列格式：「七上/七下/八上/八下/九上/九下」
const GRADE_LABEL_TO_TERM: Record<string, GradeTerm> = {
  '七上': '7A',
  '七下': '7B',
  '八上': '8A',
  '八下': '8B',
  '九上': '9A',
  '九下': '9B',
};

/**
 * 按学期过滤知识点 CSV，返回带表头的 CSV 字符串。
 * 过滤逻辑：年级列对应学期 ≤ gradeTerm（当前学期包含在内）。
 * 供 ReviewNode 注入 prompt，确保术语库只含妹妹已学内容。
 */
export function filterKnowledgePointsCsvByGradeTerm(gradeTerm: GradeTerm): string {
  const currentIdx = GRADE_TERMS.indexOf(gradeTerm);
  const lines = raw.split('\n');
  const header = lines[0];
  const filtered = lines.slice(1).filter(line => {
    if (!line.trim()) return false;
    // CSV 列：ID,知识点,别名,年级,出处（第 4 列，0-indexed = 3）
    const parts = line.split(',');
    const gradeLabel = parts[3]?.trim() ?? '';
    const term = GRADE_LABEL_TO_TERM[gradeLabel];
    if (!term) return false;
    return GRADE_TERMS.indexOf(term) <= currentIdx;
  });
  return [header, ...filtered].join('\n');
}
