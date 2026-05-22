/**
 * OCR 结果 fixture。
 * 三组：单题（二次函数）/ 多题（3 题列表）/ OOS（非数学题）。
 */

/** 单题：二次函数 */
export const ocrSingleQuestion =
  '已知二次函数 $f(x) = ax^2 + bx + c$，满足 $f(0) = 1$，$f(1) = 0$，$f(2) = 3$，求 $a$、$b$、$c$ 的值。'

/** 多题：3 题列表，不同题型 */
export const ocrMultiQuestion = [
  '（1）已知二次函数 $f(x) = x^2 - 4x + 3$，求其顶点坐标及对称轴。',
  '（2）在直角三角形 $ABC$ 中，$\\angle C = 90°$，$BC = 3$，$AC = 4$，求 $\\tan A$ 的值。',
  '（3）一组数据：$2, 4, 6, 8, 10$，求其均值与方差。',
]

/** OOS：非数学题，会触发礼貌拒答兜底 */
export const ocrOutOfScope =
  'This is a photo of a history textbook page discussing the causes of World War I, including the assassination of Archduke Franz Ferdinand and the alliance system in Europe.'
