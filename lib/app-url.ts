/**
 * アプリケーションの公開URLを取得する
 * 環境変数の末尾改行・空白を除去し、LINE送信時のURL改行問題を防止する
 */
export function getAppUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`
      : 'http://localhost:3000')
  return url
}
