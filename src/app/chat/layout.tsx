'use client';

import { Sidebar } from '@/features/chat/components/Sidebar';
import { useConversation } from '@/stores/useConversation';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    const chatConversation = useConversation(state => state.chatConversation);
    const currentConversationId = useConversation(state => state.currentConversationId);
    const setCurrentConversationId = useConversation(state => state.setCurrentConversationId);
    const loadAllConversation = useConversation(state => state.loadAllConversation);
    const router = useRouter();

    useEffect(() => {
        loadAllConversation();
    }, []);

    return (
        <div className="flex h-screen bg-background">
            <Sidebar
                conversations={chatConversation.map(c => ({
                    id: c.id,
                    title: c.title,
                    isActive: c.id === currentConversationId,
                    createdAt: c.createdAt,
                }))}
                activeId={currentConversationId}
                onSelectConversation={(id) => {
                    setCurrentConversationId(id);
                    router.push(`/chat/${id}`);
                }}
                onNewConversation={() => {
                    setCurrentConversationId('');
                    router.push('/chat');
                }}
            />
            <main className="flex-1 flex flex-col overflow-hidden">
                {children}
            </main>
        </div>
    );
}
