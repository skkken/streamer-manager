import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Streamer Manager',
  description: '配信者育成・管理ツール',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
