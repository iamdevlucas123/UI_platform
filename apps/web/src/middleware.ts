import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/**
 * `clerkMiddleware()` (seção 9 do MVP2, código canônico do documento) —
 * pré-requisito para `auth()`/`getToken()` funcionarem em qualquer Server
 * Component da árvore, inclusive `/component/[slug]` (revisão de DRAFT via
 * `?preview=1`, seção 5.2). `/admin` ainda não existe nesta etapa, mas o
 * matcher já cobre a rota futura sem exigir mudanças aqui.
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
