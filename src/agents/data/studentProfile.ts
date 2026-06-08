// P-001 学情知识边界 — 学生学情配置
// 读取 STUDENT_GRADE_TERM 环境变量；非法或缺失时 fallback '7B' 并 console.warn

import { GRADE_TERMS, type GradeTerm } from './bsdMathCatalog';

const raw = process.env.STUDENT_GRADE_TERM;

const isValid = (v: string | undefined): v is GradeTerm =>
    GRADE_TERMS.includes(v as GradeTerm);

export const studentGradeTerm: GradeTerm = isValid(raw)
    ? (raw as GradeTerm)
    : (() => {
          console.warn(
              `[studentProfile] STUDENT_GRADE_TERM="${raw}" 不在合法值 [${GRADE_TERMS.join(',')}] 中，fallback 为 '7B'`
          );
          return '7B' as GradeTerm;
      })();
