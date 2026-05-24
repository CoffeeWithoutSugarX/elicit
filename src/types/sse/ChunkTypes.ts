import type { SanitizedQuestion } from "@/agents/schemas/OcrSchema";
import type { KnowledgeCard } from "@/agents/schemas/KnowledgeCardSchema";

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

export type CustomChunk =
    | ConversationCreatedChunk
    | PhaseChangedChunk
    | KnowledgeCardChunk
    | QuestionsDetectedChunk
    | SubProblemChangedChunk;
