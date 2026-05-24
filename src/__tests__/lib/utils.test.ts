import { describe, it, expect, vi } from 'vitest';
import { cn, generateId, streamIterator } from '@/lib/utils';

describe('cn', () => {
  it('单个 class → 原样返回', () => {
    expect(cn('text-red-500')).toBe('text-red-500');
  });

  it('多个 class → 合并为空格分隔字符串', () => {
    expect(cn('text-sm', 'font-bold')).toBe('text-sm font-bold');
  });

  it('falsy 值（false/null/undefined）→ 过滤掉', () => {
    expect(cn('base', false && 'never', null, undefined, 'end')).toBe('base end');
  });

  it('条件 class（对象语法）→ 只保留 true 的 key', () => {
    expect(cn({ 'bg-blue-500': true, 'bg-red-500': false })).toBe('bg-blue-500');
  });

  it('冲突的 Tailwind class → tailwind-merge 保留最后一个', () => {
    // tailwind-merge 语义：后来居上
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });

  it('空调用 → 返回空字符串', () => {
    expect(cn()).toBe('');
  });

  it('数组语法 → 展平并合并', () => {
    expect(cn(['text-sm', 'font-mono'])).toBe('text-sm font-mono');
  });
});

describe('generateId', () => {
  it('返回字符串', () => {
    expect(typeof generateId()).toBe('string');
  });

  it('返回合法的 UUID v4 格式', () => {
    const id = generateId();
    // UUID v4: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('每次调用返回不同的 ID', () => {
    const ids = Array.from({ length: 10 }, generateId);
    const unique = new Set(ids);
    expect(unique.size).toBe(10);
  });
});

// ——— 辅助：用原始字节构建模拟 Response ———

function makeResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream);
}

describe('streamIterator', () => {
  it('body 为 null → 立即结束（没有 yield）', async () => {
    const response = new Response(null);
    const items: unknown[] = [];
    for await (const item of streamIterator(response)) {
      items.push(item);
    }
    expect(items).toHaveLength(0);
  });

  it('单行合法 JSON → yield 一条 ChunkMessage', async () => {
    const msg = { id: '1', type: 'text', delta: 'hello', data: {} };
    const response = makeResponse([`data: ${JSON.stringify(msg)}\n`]);
    const items: unknown[] = [];
    for await (const item of streamIterator(response)) {
      items.push(item);
    }
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual(msg);
  });

  it('[DONE] 行 → 被跳过，不 yield', async () => {
    const response = makeResponse(['data: [DONE]\n']);
    const items: unknown[] = [];
    for await (const item of streamIterator(response)) {
      items.push(item);
    }
    expect(items).toHaveLength(0);
  });

  it('空行 → 被跳过', async () => {
    const msg = { id: '2', type: 'text', delta: 'world' };
    const response = makeResponse([`\ndata: ${JSON.stringify(msg)}\n\n`]);
    const items: unknown[] = [];
    for await (const item of streamIterator(response)) {
      items.push(item);
    }
    expect(items).toHaveLength(1);
  });

  it('多行 JSON → 依次 yield', async () => {
    const msg1 = { id: '1', type: 'text', delta: 'a' };
    const msg2 = { id: '2', type: 'text', delta: 'b' };
    const body = `data: ${JSON.stringify(msg1)}\ndata: ${JSON.stringify(msg2)}\n`;
    const response = makeResponse([body]);
    const items: unknown[] = [];
    for await (const item of streamIterator(response)) {
      items.push(item);
    }
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual(msg1);
    expect(items[1]).toEqual(msg2);
  });

  it('非 JSON 行 → console.warn 但不 yield，不抛出', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const response = makeResponse(['data: not-valid-json\n']);
    const items: unknown[] = [];
    for await (const item of streamIterator(response)) {
      items.push(item);
    }
    expect(items).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('解析流数据失败'),
      expect.any(String),
      expect.any(Error),
    );
    warnSpy.mockRestore();
  });

  it('无 "data: " 前缀的合法 JSON → 也能 yield（trim 后直接解析）', async () => {
    const msg = { id: '3', type: 'text', delta: 'no-prefix' };
    const response = makeResponse([`${JSON.stringify(msg)}\n`]);
    const items: unknown[] = [];
    for await (const item of streamIterator(response)) {
      items.push(item);
    }
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual(msg);
  });
});
