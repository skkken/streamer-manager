import { ImageResponse } from 'next/og'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
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
          borderRadius: 7,
          color: 'white',
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: '-0.5px',
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
