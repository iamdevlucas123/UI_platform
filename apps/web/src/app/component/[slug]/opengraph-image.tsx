import { ImageResponse } from 'next/og';

import { serverApi } from '@/lib/api-client';

/**
 * Imagem Open Graph do detalhe de componente (seção 5.2/7 do MVP2), gerada
 * em runtime com `ImageResponse` — sem upload nem dependência de imagem
 * externa. Busca com `serverApi.getComponent(slug)` **sem** `preview`/token
 * (a mesma consulta 100% pública usada pelo visitante anônimo) — por
 * construção, isto nunca consegue resolver um DRAFT: se o slug não estiver
 * publicado, a chamada rejeita e a geração da imagem falha, exatamente como
 * aconteceria para qualquer visitante sem sessão de admin.
 *
 * A imagem incorpora só campos públicos e seguros do componente — nome,
 * categoria e descrição (texto puro) — nunca `html`/`css`/`js`/`prompt`,
 * que não fazem sentido como imagem e não devem vazar por este caminho.
 */
export const alt = 'Component preview';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const MAX_DESCRIPTION_LENGTH = 140;

function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
}

export default async function ComponentOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data: component } = await serverApi.getComponent(
    slug,
    {},
    { revalidate: 300, tags: ['components'] },
  );

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
        <div style={{ display: 'flex', fontSize: 26, fontWeight: 600, opacity: 0.6, letterSpacing: 2 }}>
          {component.category.name.toUpperCase()}
        </div>
        <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, marginTop: 20, lineHeight: 1.15 }}>
          {component.name}
        </div>
        <div style={{ display: 'flex', fontSize: 28, marginTop: 24, opacity: 0.8, maxWidth: 960 }}>
          {truncate(component.description, MAX_DESCRIPTION_LENGTH)}
        </div>
        {component.technologies.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginTop: 40 }}>
            {component.technologies.slice(0, 5).map((technology) => (
              <div
                key={technology}
                style={{
                  display: 'flex',
                  fontSize: 22,
                  padding: '8px 18px',
                  borderRadius: 999,
                  border: '1px solid rgba(250,250,250,0.35)',
                }}
              >
                {technology}
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    { ...size },
  );
}
