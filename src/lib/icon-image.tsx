import { ImageResponse } from 'next/og';

/** Generates the FurniCraft app icon as PNG (used for PWA + apple icon). */
export function iconResponse(size: number, maskable = false) {
  const pad = maskable ? 0 : Math.round(size * 0.06);
  const radius = maskable ? 0 : Math.round(size * 0.22);
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          padding: pad,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: radius,
            background: 'linear-gradient(145deg, #9a5f31 0%, #653d27 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fdf8ee',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: Math.round(size * (maskable ? 0.32 : 0.38)),
              fontWeight: 800,
              letterSpacing: -Math.round(size * 0.01),
              lineHeight: 1,
            }}
          >
            FC
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: Math.round(size * 0.04),
              width: Math.round(size * (maskable ? 0.36 : 0.44)),
              height: Math.max(2, Math.round(size * 0.035)),
              borderRadius: 99,
              background: '#e8d2b0',
            }}
          />
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
