'use client'

import { useRouter } from 'next/navigation'
import { createAuthBrowserClient } from '@/lib/supabase/auth-client'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createAuthBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="block w-full text-left px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
    >
      ログアウト
    </button>
  )
}
