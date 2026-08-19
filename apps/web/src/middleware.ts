import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/**
 * `clerkMiddleware()` (seção 9 do MVP2, código canônico do documento) —
 * pré-requisito para `auth()`/`getToken()` funcionarem em qualquer Server
 * Component da árvore, inclusive `/component/[slug]` (revisão de DRAFT via
 * `?preview=1`, seção 5.2). `auth.protect()` cobre só a AUTENTICAÇÃO
 * (sessão existe?) em `/admin/*` — redireciona para `/sign-in` sem sessão;
 * a AUTORIZAÇÃO (`role: 'admin'`) é responsabilidade de `app/admin/layout.tsx`.
 */
const isProtectedRoute = createRouteMatcher(['/admin(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/(api|trpc)(.*)'],
};
