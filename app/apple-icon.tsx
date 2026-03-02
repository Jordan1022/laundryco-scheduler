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
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: 78,
          letterSpacing: -3,
          borderRadius: 28,
        }}
      >
        LC
      </div>
    ),
    size,
  )
}
