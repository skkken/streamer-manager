import * as Sentry from '@sentry/nextjs'

/**
 * API ルートでのエラーを Sentry にキャプチャする
 */
export function captureApiError(
  error: unknown,
  route: string,
  method: string,
  extra?: Record<string, unknown>
) {
  Sentry.captureException(error, {
    extra: { route, method, ...extra },
  })
}
