import { readFileSync } from 'fs';
import { join } from 'path';

export interface KnowledgePoint {
  id: string;
  name: string;
  aliases: string[];
  grade: string;
  textbookRef: string;
}

const csvPath = join(process.cwd(), 'src/agents/data/knowledge-points.csv');
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
