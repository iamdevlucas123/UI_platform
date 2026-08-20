import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { buildContentSecurityPolicy, clerkFrontendApiOrigin, generateNonce } from '@/lib/csp';
import { publicEnv } from '@/lib/env';

/**
 * `clerkMiddleware()` (seção 9 do MVP2, código canônico do documento) —
 * pré-requisito para `auth()`/`getToken()` funcionarem em qualquer Server
 * Component da árvore, inclusive `/component/[slug]` (revisão de DRAFT via
 * `?preview=1`, seção 5.2). `auth.protect()` cobre só a AUTENTICAÇÃO
 * (sessão existe?) em `/admin/*` — redireciona para `/sign-in` sem sessão;
 * a AUTORIZAÇÃO (`role: 'admin'`) é responsabilidade de `app/admin/layout.tsx`.
 */
const isProtectedRoute = createRouteMatcher(['/admin(.*)']);

/** Computado uma vez no boot — não muda por request, só a env em si mudaria. */
const CLERK_ORIGIN = clerkFrontendApiOrigin(publicEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
const API_ORIGIN = new URL(publicEnv.NEXT_PUBLIC_API_URL).origin;

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // CSP do site (seção 11 do MVP2 — ver `lib/csp.ts` para o raciocínio
  // completo). Publicada tanto no header da REQUEST (assim o App Router lê
  // o nonce de volta via `getScriptNonceFromHeader` e o aplica sozinho a
  // todo `<script>` que gera) quanto no header da RESPONSE (assim o
  // navegador de fato aplica a política).
  const nonce = generateNonce();
  const csp = buildContentSecurityPolicy({
    nonce,
    clerkFrontendApiOrigin: CLERK_ORIGIN,
    apiOrigin: API_ORIGIN,
  });

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/(api|trpc)(.*)'],
};
