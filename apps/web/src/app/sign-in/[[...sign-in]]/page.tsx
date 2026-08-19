import { SignIn } from '@clerk/nextjs';
import type { Metadata } from 'next';

/**
 * `/sign-in` (seção 9 do MVP2): único ponto de entrada de autenticação,
 * usado pelo administrador. O catch-all opcional `[[...sign-in]]` é exigido
 * pelo próprio `<SignIn />` — ele monta sub-rotas internas (verificação,
 * MFA etc.) sob o mesmo path. `noindex` porque não há motivo para esta
 * página aparecer em busca (não é conteúdo público do catálogo); `robots.ts`
 * já bloqueia `/sign-in` para crawlers, isto é defesa em profundidade.
 */
export const metadata: Metadata = {
  title: 'Sign in — UI Library',
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <SignIn />
    </main>
  );
}
