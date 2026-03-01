import { Suspense } from 'react'
import LoginForm from './LoginForm'

export const metadata = {
  title: 'ログイン - Streamer Manager',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-md px-8 py-10 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 text-lg font-extrabold text-white shadow-lg mb-3">
            SM
          </span>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Streamer Manager
          </h1>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
