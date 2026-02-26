import { createHash, randomBytes } from 'crypto'

/** 推測不能な32バイトのランダムトークンを生成 */
export function generateToken(): string {
  return randomBytes(32).toString('hex') // 64文字
}

/** トークンをsha256ハッシュ化（DBに保存する値） */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
