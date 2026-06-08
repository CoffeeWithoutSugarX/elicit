import type { SanitizedQuestion } from "@/agents/schemas/OcrSchema";
import type { KnowledgeCard } from "@/agents/schemas/KnowledgeCardSchema";

// streamIterator yield 的 SSE chunk 结构
export type ChunkMessage = {
    id: string;
    type: string;
    delta: string;
    data?: Record<string, unknown>;
    errorText?: string;
}

// `kind` 字段是 data-custom chunk 的鉴别器

export interface ConversationCreatedChunk {
    kind: 'conversation_created';
    conversationId: string;
    title: string;
}

export interface PhaseChangedChunk {
    kind: 'phase_changed';
    phase: number;
}

export interface KnowledgeCardChunk {
    kind: 'knowledge_card';
    card: KnowledgeCard;
}

export interface QuestionsDetectedChunk {
    kind: 'questions_detected';
    questions: SanitizedQuestion[];
    isMulti: boolean;
}

export interface SubProblemChangedChunk {
    kind: 'sub_problem_changed';
    currentIndex: number;
    totalCount: number;
}

// phase 节点（understand/plan/execute/review）在 nostream 模式下主动推出的干净正文
export interface AssistantMessageChunk {
    kind: 'assistant_message';
    text: string;
}

export type CustomChunk =
    | ConversationCreatedChunk
    | PhaseChangedChunk
    | KnowledgeCardChunk
    | QuestionsDetectedChunk
    | SubProblemChangedChunk
    | AssistantMessageChunk;
