/**
 * 文本工具函数
 *
 * 放置与文本处理相关的纯函数，供前端组件和工具链共享。
 */

/**
 * 将字符串中的字面 \n（反斜杠 + 字母 n，两个字符）替换为真实换行符。
 *
 * 背景：vision OCR 模型有时会输出字面的 "\n" 两字符而非真实换行，
 * 导致前端渲染成乱码感文本（如 `= a^2 − 1；\n+ a + 1`）。
 * 此函数作为 Postel 法则的展示层兜底，在 prompt 约束无法 100% 保证模型遵守时
 * 清理输出，确保换行正常显示。
 *
 * 注意：已经是真实换行符（\n 字符，Unicode U+000A）的内容不受影响。
 */
export function unescapeLiteralNewlines(text: string): string {
    // 将字面两字符序列 \n（0x5C 0x6E）替换为真实换行符（0x0A）
    return text.replace(/\\n/g, '\n');
}
