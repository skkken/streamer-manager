'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoutButton from './LogoutButton'

const navItems = [
  { label: '配信者一覧', href: '/streamers' },
  { label: 'テンプレ管理', href: '/templates' },
  { label: '運用ボード', href: '/board' },
  { label: 'LINE登録待ち', href: '/admin/line-registrations' },
  { label: 'LINEチャネル', href: '/admin/line-channels' },
  { label: '通知ジョブ', href: '/admin/notifications' },
  { label: 'メッセージ設定', href: '/admin/messages' },
  { label: 'エラーログ', href: '/admin/errors' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="px-6 py-5 border-b border-gray-700">
        <span className="text-sm font-bold tracking-wider text-gray-300">
          配信者管理
        </span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded text-sm transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {item.label}
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
