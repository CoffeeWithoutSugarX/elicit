import { getAuthHeaders } from '@/services/api-client/getAuthHeaders';

// ── 响应类型（与 /api/admin/conversations 和 /api/admin/conversations/[id] 对齐） ──

export interface AdminConversation {
    conversationId: string;
    title: string | null;
    userId: string;
    createdAt: string;
    currentPhase: number;
    hasResolved: boolean;
}

export interface AdminMessage {
    messageId: string;
    role: number;
    content: string;
    imgUrl: string | null;
    createdAt: string;
    type: number;
}

export interface AdminConversationDetail {
    conversation: AdminConversation;
    messages: AdminMessage[];
}

/** 管理员无权限时抛出该错误（401 / 403），页面据此显示「无权限」提示 */
export class AdminUnauthorizedError extends Error {
    constructor() {
        super('UNAUTHORIZED');
        this.name = 'AdminUnauthorizedError';
    }
}

class AdminRequest {
    /** 拉取所有会话列表（GET /api/admin/conversations） */
    getConversations = async (): Promise<AdminConversation[]> => {
        const response = await fetch('/api/admin/conversations', {
            method: 'GET',
            headers: {
                ...await getAuthHeaders(),
            },
        });

        if (response.status === 401 || response.status === 403) {
            throw new AdminUnauthorizedError();
        }

        if (!response.ok) {
            throw new Error(`获取会话列表失败: ${response.status}`);
        }

        const data: { conversations: AdminConversation[] } = await response.json();
        return data.conversations;
    };

    /** 拉取单条会话详情（GET /api/admin/conversations/[conversationId]） */
    getConversationDetail = async (conversationId: string): Promise<AdminConversationDetail> => {
        const response = await fetch(`/api/admin/conversations/${conversationId}`, {
            method: 'GET',
            headers: {
                ...await getAuthHeaders(),
            },
        });

        if (response.status === 401 || response.status === 403) {
            throw new AdminUnauthorizedError();
        }

        if (response.status === 404) {
            throw new Error('NOT_FOUND');
        }

        if (!response.ok) {
            throw new Error(`获取会话详情失败: ${response.status}`);
        }

        return response.json() as Promise<AdminConversationDetail>;
    };
}

export const adminRequest = new AdminRequest();
