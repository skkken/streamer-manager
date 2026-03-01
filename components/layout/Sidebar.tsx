'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoutButton from './LogoutButton'

import type { UserRole } from '@/lib/types'

const BADGE_HREF = '/admin/line-registrations'

const navItems: { label: string; href: string; adminOnly?: boolean }[] = [
  { label: '配信者一覧', href: '/streamers' },
  { label: 'テンプレ管理', href: '/templates', adminOnly: true },
  { label: '運用ボード', href: '/board', adminOnly: true },
  { label: 'LINE登録待ち', href: BADGE_HREF, adminOnly: true },
  { label: 'LINEチャネル', href: '/admin/line-channels', adminOnly: true },
  { label: 'ユーザー管理', href: '/admin/users', adminOnly: true },
  { label: '通知ジョブ', href: '/admin/notifications', adminOnly: true },
  { label: 'メッセージ設定', href: '/admin/messages', adminOnly: true },
  { label: 'Cron設定', href: '/admin/cron', adminOnly: true },
]

export default function Sidebar({ pendingCount = 0, role = 'admin' }: { pendingCount?: number; role?: UserRole }) {
  const pathname = usePathname()

  return (
    <aside className="w-56 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="px-6 py-5 border-b border-gray-700">
        <span className="text-sm font-bold tracking-wider text-gray-300">
          配信者管理
        </span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.filter(item => !item.adminOnly || role === 'admin').map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded text-sm transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {item.label}
              {item.href === BADGE_HREF && pendingCount > 0 && (
                <span className="ml-2 min-w-[1.25rem] px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full text-center">
                  {pendingCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
      <div className="px-6 py-4 border-t border-gray-700 space-y-2">
        <LogoutButton />
        <p className="text-xs text-gray-500">v0.1.0</p>
      </div>
    </aside>
  )
}
