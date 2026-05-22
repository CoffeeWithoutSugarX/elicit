/**
 * P-5 登录页 — 数学笔记本美学版本。
 * 象牙白纸面卡片 + Fraunces 衬线标题 + Plex Sans 输入框 + 朱砂红错误提示。
 * 4 态切换：空 / 邮箱格式错 / 密码错 / 成功（useState mock，不真实路由跳转）。
 */
import { useState } from 'react'
import { cn } from '@/lib/classNames'

type LoginState = 'idle' | 'email-error' | 'password-error' | 'success'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function LoginRoute() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginState, setLoginState] = useState<LoginState>('idle')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!isValidEmail(email)) {
      setLoginState('email-error')
      return
    }

    // mock 密码校验：任何非空 != 'correct' 视为密码错误
    if (password !== 'correct' && password.length > 0) {
      setLoginState('password-error')
      return
    }

    if (password === 'correct') {
      setLoginState('success')
      return
    }

    setLoginState('email-error')
  }

  const isSuccess = loginState === 'success'

  return (
    <main className="min-h-screen bg-paper-canvas flex items-center justify-center p-6">
      <div
        className={cn(
          'w-full max-w-sm',
          'bg-paper-surface border border-ink-line rounded-sm',
          'shadow-paper-lg p-8',
        )}
      >
        {/* 顶部装饰 */}
        <div
          className="flex items-center justify-center gap-3 text-ink-line tracking-widest mb-6"
          aria-hidden
        >
          <span style={{ fontSize: '1.2em' }}>≡</span>
          <span style={{ fontSize: '1.2em' }}>≡</span>
          <span style={{ fontSize: '1.2em' }}>≡</span>
        </div>

        {/* 品牌标题：Fraunces 衬线大字 */}
        <h1
          className="text-3xl text-ink-primary text-center mb-1 tracking-tight"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
        >
          引思助手
        </h1>
        <p
          className="text-xs text-ink-muted text-center mb-8 tracking-widest"
          style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
        >
          MATHEMATICAL NOTEBOOK
        </p>

        {/* 成功态 */}
        {isSuccess ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div
              className="text-4xl text-center text-ink-primary"
              style={{ fontFamily: 'var(--font-display)' }}
              aria-hidden
            >
              ✓
            </div>
            <p
              className="text-sm text-ink-secondary text-center"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              登录成功！欢迎回来。
            </p>
            <button
              type="button"
              onClick={() => {
                setLoginState('idle')
                setEmail('')
                setPassword('')
              }}
              className="text-xs text-ink-muted underline"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              返回
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            {/* 邮箱字段 */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-xs text-ink-secondary tracking-widest uppercase"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontFeatureSettings: '"smcp"',
                  letterSpacing: '0.1em',
                }}
              >
                邮箱
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (loginState === 'email-error') setLoginState('idle')
                }}
                placeholder="you@example.com"
                autoComplete="email"
                className={cn(
                  'w-full px-3 py-2.5 text-sm',
                  'bg-paper-canvas border rounded-sm',
                  'text-ink-primary placeholder:text-ink-muted',
                  'outline-none transition-colors',
                  loginState === 'email-error'
                    ? 'border-vermilion focus:border-vermilion'
                    : 'border-ink-line focus:border-ink-secondary',
                )}
                style={{ fontFamily: 'var(--font-body)' }}
              />
              {loginState === 'email-error' && (
                <p
                  className="text-xs text-vermilion"
                  style={{ fontFamily: 'var(--font-body)' }}
                  role="alert"
                >
                  请输入有效的邮箱地址
                </p>
              )}
            </div>

            {/* 密码字段 */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-xs text-ink-secondary tracking-widest uppercase"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontFeatureSettings: '"smcp"',
                  letterSpacing: '0.1em',
                }}
              >
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (loginState === 'password-error') setLoginState('idle')
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                className={cn(
                  'w-full px-3 py-2.5 text-sm',
                  'bg-paper-canvas border rounded-sm',
                  'text-ink-primary placeholder:text-ink-muted',
                  'outline-none transition-colors',
                  loginState === 'password-error'
                    ? 'border-vermilion focus:border-vermilion'
                    : 'border-ink-line focus:border-ink-secondary',
                )}
                style={{ fontFamily: 'var(--font-body)' }}
              />
              {loginState === 'password-error' && (
                <p
                  className="text-xs text-vermilion"
                  style={{ fontFamily: 'var(--font-body)' }}
                  role="alert"
                >
                  密码错误，请重试
                </p>
              )}
            </div>

            {/* 提示：演示密码 */}
            <p
              className="text-[10px] text-ink-muted"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              演示模式：密码输入 "correct" 可进入成功态
            </p>

            {/* 提交按钮 */}
            <button
              type="submit"
              className={cn(
                'w-full py-2.5 rounded-md text-sm',
                'bg-ink-deep text-paper-surface',
                'hover:opacity-90 transition-opacity',
                'shadow-paper-sm',
              )}
              style={{
                fontFamily: 'var(--font-display)',
                fontFeatureSettings: '"smcp"',
                letterSpacing: '0.06em',
              }}
            >
              登 录
            </button>
          </form>
        )}

        {/* 章节分隔 */}
        <div className="flex items-center justify-center mt-6">
          <span className="text-ink-muted text-xs tracking-widest">——— ※ ———</span>
        </div>
        <p
          className="text-center text-[10px] text-ink-muted mt-2"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          UI 原型 · 仅演示
        </p>
      </div>
    </main>
  )
}
