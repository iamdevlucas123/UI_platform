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
 * em `/admin`, mas já em `/component/[slug]`, cuja revisão de DRAFT via
 * `?preview=1` depende de checar `role: 'admin'` na sessão (ver
 * `resolveAdminPreviewToken` na página). Lê `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`/
 * `CLERK_SECRET_KEY`/`NEXT_PUBLIC_CLERK_SIGN_IN_URL` do ambiente
 * automaticamente — já validados em `@/lib/env`.
 *
 * `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`, porém, **não** é um nome de env
 * reconhecido pelo `@clerk/nextjs` v7 (que lê
 * `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`) — por isso é repassado
 * explicitamente como `signInFallbackRedirectUrl`. É só o *fallback*: quando
 * `clerkMiddleware` redireciona para `/sign-in` a partir de `/admin/*`
 * (`auth.protect()`, em `middleware.ts`), o `redirect_url` embutido nesse
 * redirect já leva de volta à rota original após o login, tomando
 * precedência sobre este valor.
 *
 * `afterSignOutUrl` também é global do provider (não uma prop de
 * `<UserButton>` nesta versão do SDK) — leva de volta à home pública depois
 * que o admin sai pelo menu em `app/admin/layout.tsx`.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      signInFallbackRedirectUrl={publicEnv.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL}
      afterSignOutUrl="/"
    >
      <html lang="en">
        <body className="min-h-screen bg-white text-neutral-950 antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
