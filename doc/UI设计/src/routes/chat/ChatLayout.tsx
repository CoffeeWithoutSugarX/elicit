/**
 * 聊天页统一布局：左侧 Sidebar + 右主区域。
 * 子路由通过 Outlet 渲染（react-router v7）。
 * Batch 2：Sidebar 数据为 placeholder 空数组，Batch 3 接 mock/conversations.ts。
 */
import { Outlet, useNavigate } from 'react-router'
import { Sidebar } from '@/components/Sidebar'

export function ChatLayout() {
  const navigate = useNavigate()

  return (
    <div className="flex h-screen w-screen bg-paper-canvas overflow-hidden">
      <Sidebar
        conversations={[]}
        onSelectConversation={(id) => navigate(`/chat/${id}`)}
        onNewConversation={() => navigate('/chat/p101-empty')}
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
