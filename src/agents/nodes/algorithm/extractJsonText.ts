/**
 * 从模型输出中提取 JSON 文本。
 * 优先返回 ```json 围栏内的文本（也兼容无语言标注的 ``` 围栏），
 * 若无围栏则返回原文 trim。
 *
 * 遵循 Postel 法则（宽容解析）：兼容围栏内 JSON 和裸 JSON 两种格式，
 * 与项目 SSE 协议行的宽容解析原则一致。
 */
export function extractJsonText(text: string): string {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenced) return fenced[1];
    return text.trim();
}
