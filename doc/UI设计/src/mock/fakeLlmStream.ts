/**
 * 流式打字机模拟。
 * slow=100ms/char, normal=33ms/char, instant=立即 onDone。
 * 支持 AbortSignal 中断：中断时不调 onDone，throw AbortError。
 */

export type StreamSpeed = 'slow' | 'normal' | 'instant'

export interface StreamOptions {
  speed: StreamSpeed
  onChunk: (chunk: string) => void
  onDone: () => void
  signal?: AbortSignal
}

/** 按字符切分文本，中文/LaTeX 各算 1 char */
function splitChars(text: string): string[] {
  // spread 操作正确处理 Unicode codepoint（中文、emoji 等）
  return [...text]
}

export function fakeLlmStream(text: string, opts: StreamOptions): Promise<void> {
  const { speed, onChunk, onDone, signal } = opts

  return new Promise((resolve, reject) => {
    // 瞬时模式：直接 flush 全文
    if (speed === 'instant') {
      if (signal?.aborted) {
        reject(new DOMException('Stream aborted', 'AbortError'))
        return
      }
      onChunk(text)
      onDone()
      resolve()
      return
    }

    const chars = splitChars(text)
    const delayMs = speed === 'slow' ? 100 : 33
    let index = 0

    function next() {
      // 检查是否已中断
      if (signal?.aborted) {
        reject(new DOMException('Stream aborted', 'AbortError'))
        return
      }

      if (index >= chars.length) {
        onDone()
        resolve()
        return
      }

      const char = chars[index]
      if (char !== undefined) {
        onChunk(char)
      }
      index++

      const timerId = setTimeout(next, delayMs)

      // 监听 abort：清除 timer + reject
      signal?.addEventListener('abort', () => {
        clearTimeout(timerId)
        reject(new DOMException('Stream aborted', 'AbortError'))
      }, { once: true })
    }

    next()
  })
}
