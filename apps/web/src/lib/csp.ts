/**
 * Content-Security-Policy do site (seção 11 do MVP2): `default-src 'self'`,
 * `frame-src 'self' data:`, `img-src 'self' data: https:` e só os domínios
 * exigidos pelo Clerk liberados em `script-src`/`connect-src` — nunca um
 * domínio extra não documentado na seção 11.
 *
 * Duas exceções funcionais, não domínios de terceiros:
 * - `'nonce-<valor por request>'` em `script-src`: o App Router do Next.js
 *   15 injeta `<script>` inline sem `src` para o payload de streaming/RSC
 *   (`self.__next_f.push(...)`, os helpers `$RC`/`$RB`/`$RV` de reveal de
 *   Suspense) — confirmado inspecionando o HTML servido por `next dev`
 *   nesta etapa. Sem nonce (nem `'unsafe-inline'`, que a seção 11 não pede
 *   e enfraqueceria a CSP para qualquer script injetado), esses scripts
 *   seriam bloqueados e a página nunca hidrataria. O Next.js já sabe ler o
 *   nonce de volta do header `Content-Security-Policy` da própria request
 *   (`getScriptNonceFromHeader`) e aplica-o sozinho a todo `<script>` que
 *   gera — só precisamos gerar um nonce novo por request e publicá-lo nos
 *   dois lugares (`middleware.ts` faz isso).
 * - `NEXT_PUBLIC_API_URL` em `connect-src`: seção 10 do MVP2 — o browser
 *   chama a API diretamente (CRUD admin, seletor de stack do prompt), numa
 *   origem diferente de `NEXT_PUBLIC_SITE_URL` em desenvolvimento
 *   (`localhost:4000` vs `localhost:3000`). Sem isso, toda mutação
 *   administrativa e a troca de stack do prompt quebrariam sob esta CSP.
 */
export interface ContentSecurityPolicyInput {
  nonce: string;
  clerkFrontendApiOrigin: string;
  apiOrigin: string;
}

/**
 * Extrai a origem "Frontend API" do Clerk a partir da publishable key —
 * formato documentado do Clerk: `pk_(test|live)_<base64("<frontend-api>$")>`.
 * Evita hardcodar um domínio específico de instância (ex.:
 * `vast-elf-9900.clerk.accounts.dev`), que mudaria a cada novo projeto
 * Clerk/ambiente e ficaria desatualizado sem ninguém notar.
 */
export function clerkFrontendApiOrigin(publishableKey: string): string {
  const encoded = publishableKey.replace(/^pk_(test|live)_/, '');
  const decoded = atob(encoded).replace(/\$$/, '');
  return `https://${decoded}`;
}

export function buildContentSecurityPolicy({
  nonce,
  clerkFrontendApiOrigin: clerkOrigin,
  apiOrigin,
}: ContentSecurityPolicyInput): string {
  return [
    "default-src 'self'",
    "frame-src 'self' data:",
    "img-src 'self' data: https:",
    `script-src 'self' 'nonce-${nonce}' ${clerkOrigin}`,
    `connect-src 'self' ${clerkOrigin} ${apiOrigin}`,
  ].join('; ');
}

/** Nonce aleatório por request (Web Crypto — disponível no Edge Runtime do middleware). */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
