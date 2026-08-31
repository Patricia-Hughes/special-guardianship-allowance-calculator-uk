import { ImageResponse } from 'next/og';

export const alt =
  'Special guardianship allowance calculator, find out what your council should be paying you';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Required for `output: 'export'` — the image is generated once, at build time.
export const dynamic = 'force-static';

/**
 * Generated at build time (§27). No web font is fetched, a build that reaches
 * out over the network for a typeface is a build that can fail for a reason
 * nobody can reproduce.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: '#ffffff',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 30, color: '#4a4a4a', marginBottom: 24 }}>
          Special guardianship allowance calculator
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 68,
            fontWeight: 700,
            color: '#0b3d2c',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
          }}
        >
          Find out what your council should be paying you
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: '#1a1a1a', marginTop: 32 }}>
          Free · private · every figure has its source next to it
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 40,
            paddingTop: 24,
            borderTop: '4px solid #a8071a',
            fontSize: 24,
            color: '#4a4a4a',
          }}
        >
          An estimate, not legal advice
        </div>
      </div>
    ),
    size,
  );
}
