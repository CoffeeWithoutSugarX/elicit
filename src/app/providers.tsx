'use client'

/**
 * 客户端全局 Provider 集合。
 * layout.tsx 是服务端组件，无法直接使用客户端 Provider，
 * 通过本文件统一包裹，再在 layout.tsx 中引入。
 */
import { TooltipProvider } from '@/components/ui/tooltip'

interface Props {
  children: React.ReactNode
}

export function Providers({ children }: Props) {
  return (
    <TooltipProvider>
      {children}
    </TooltipProvider>
  )
}
