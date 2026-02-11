import {clsx, type ClassValue} from "clsx"
import {twMerge} from "tailwind-merge"
import {v4 as uuid} from "uuid";
import {ChunkMessage} from "@/stores/useConversation";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export const generateId = () => uuid();

export async function* streamIterator(response: Response) {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder("utf-8");
    if (!reader) return;

    try {
        while (true) {
            const {done, value} = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, {stream: true});
            const lines = chunk.split("\n");

            for (let line of lines) {
                line = line.replace(/^data: /, "").trim();
                if (!line || line === "[DONE]") continue;

                try {
                    const parsedData: ChunkMessage = JSON.parse(line);
                    yield parsedData;
                } catch (e) {
                    console.warn("解析流数据失败:", line, e);
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}
