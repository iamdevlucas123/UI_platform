import { ImageResponse } from 'next/og';

/**
 * Imagem Open Graph da home (seção 5.2/7 do MVP2): gerada em runtime com
 * `ImageResponse` — sem upload nem dependência de imagem/fonte externa (só
 * texto, gradiente e a fonte padrão do Satori). Next.js injeta a tag
 * `og:image` automaticamente para `/` a partir deste arquivo; nenhuma rota
 * nova foi inventada além do que a seção 7 já lista.
 */
export const alt = 'UI Library — a public library of UI components';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          padding: '80px',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #262626 100%)',
          color: '#fafafa',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 30, fontWeight: 600, opacity: 0.6, letterSpacing: 2 }}>
          UI LIBRARY
        </div>
        <div style={{ display: 'flex', fontSize: 72, fontWeight: 700, marginTop: 24 }}>
          Copy, preview, ship.
        </div>
        <div style={{ display: 'flex', fontSize: 32, marginTop: 24, opacity: 0.8, maxWidth: 900 }}>
          A public library of UI components — live previews and ready-to-use code.
        </div>
      </div>
    ),
    { ...size },
  );
}
