import { getAuthHeaders } from '@/services/api-client/getAuthHeaders';
import { BaseResponse } from '@/types/response/BaseResponse';

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
    /**
     * 私有方法：统一执行带鉴权的 GET 请求，处理 401/403/非 ok 的公共逻辑。
     * 返回已解析的 response 对象，由调用方进一步提取 data 字段。
     */
    private async adminFetch<T>(url: string): Promise<BaseResponse<T>> {
        const response = await fetch(url, {
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
            throw new Error(`请求失败: ${response.status}`);
        }

        return await response.json() as BaseResponse<T>;
    }

    /** 拉取所有会话列表（GET /api/admin/conversations） */
    getConversations = async (): Promise<AdminConversation[]> => {
        const body = await this.adminFetch<{ conversations: AdminConversation[] }>(
            '/api/admin/conversations',
        );
        return body.data.conversations;
    };

    /** 拉取单条会话详情（GET /api/admin/conversations/[conversationId]） */
    getConversationDetail = async (conversationId: string): Promise<AdminConversationDetail> => {
        const body = await this.adminFetch<AdminConversationDetail>(
            `/api/admin/conversations/${conversationId}`,
        );
        return body.data;
    };
}

export const adminRequest = new AdminRequest();
