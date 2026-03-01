import SetPasswordForm from './SetPasswordForm'

export const metadata = {
  title: 'パスワード設定 | Streamer Manager',
}

export default function SetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 text-center mb-6">
          パスワード設定
        </h1>
        <SetPasswordForm />
      </div>
    </div>
  )
}
