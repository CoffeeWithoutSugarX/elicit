/**
 * 聊天页统一布局：左侧 Sidebar + 右主区域。
 * 子路由通过 Outlet 渲染（react-router v7）。
 * Batch 3：Sidebar 接 mock/conversations.ts 真实 mock 数据。
 */
import { Outlet, useNavigate, useParams } from 'react-router'
import { Sidebar } from '@/components/Sidebar'
import { MOCK_CONVERSATIONS } from '@/mock/conversations'

export function ChatLayout() {
  const navigate = useNavigate()
  const { scenarioId } = useParams<{ scenarioId: string }>()

  // 将 mock 会话数据转换为 Sidebar 所需格式
  const conversations = MOCK_CONVERSATIONS.map((c) => ({
    id: c.id,
    title: c.title,
    isActive: scenarioId === c.id,
    createdAt: c.createdAt,
  }))

  return (
    <div className="flex h-screen w-screen bg-paper-canvas overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeId={scenarioId}
        onSelectConversation={(id) => navigate(`/chat/${id}`)}
        onNewConversation={() => navigate('/chat/p101-empty')}
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
