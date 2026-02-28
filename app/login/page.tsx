import { Suspense } from 'react'
import LoginForm from './LoginForm'

export const metadata = {
  title: 'ログイン - 配信者管理システム',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-md px-8 py-10 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 text-center mb-6">
          配信者管理システム
        </h1>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
