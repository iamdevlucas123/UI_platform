import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { publicEnv } from '@/lib/env';

import './globals.css';

const SITE_DESCRIPTION = 'Biblioteca web pública de componentes de interface.';

/**
 * Metadata raiz (seção 5.2/7 do MVP2): serve como default para toda rota
 * sem `generateMetadata` própria — hoje, efetivamente só `/` (`app/(home)/
 * page.tsx` não define a sua). `openGraph.images` fica de fora de propósito:
 * `app/opengraph-image.tsx` (mesma pasta) já injeta a tag `og:image` para
 * `/`. Confirmado manualmente que essa convenção NÃO cascateia para
 * segmentos filhos como `loading.tsx`/`error.tsx` cascateiam — por isso
 * `/category/[slug]` e `/component/[slug]` têm cada um o seu próprio
 * `opengraph-image.tsx`, em vez de herdar este.
 */
export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_SITE_URL),
  title: 'UI Library',
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: 'UI Library',
    title: 'UI Library',
    description: SITE_DESCRIPTION,
    url: publicEnv.NEXT_PUBLIC_SITE_URL,
  },
};

/**
 * `<ClerkProvider>` (seção 9 do MVP2) precisa envolver toda a árvore para
 * que `auth()`/`getToken()` funcionem em qualquer Server Component — não só
 * em `/admin` (que ainda não existe), mas já em `/component/[slug]`, cuja
 * revisão de DRAFT via `?preview=1` depende de checar `role: 'admin'` na
 * sessão (ver `resolveAdminPreviewToken` na página). Lê
 * `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`/`CLERK_SECRET_KEY` do ambiente
 * automaticamente — ambos já validados em `@/lib/env`.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen bg-white text-neutral-950 antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
