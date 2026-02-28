'use client'

import NextError from 'next/error'

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  console.error('[GlobalError]', error)

  return (
    <html lang="ja">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  )
}
