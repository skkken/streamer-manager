import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #818cf8, #4338ca)',
          borderRadius: 36,
          color: 'white',
          fontSize: 96,
          fontWeight: 800,
          letterSpacing: '-2px',
        }}
      >
        SM
      </div>
    ),
    {
      ...size,
    }
  )
}
