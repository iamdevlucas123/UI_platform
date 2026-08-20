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
 *
 * Uma terceira exceção, só em desenvolvimento: `next dev` avalia cada
 * módulo dentro de um `eval(...)` (devtool `eval-source-map` do webpack,
 * usado pelo Fast Refresh) — confirmado ao rodar os testes E2E desta etapa
 * contra `next dev` com esta CSP: todo clique/preenchimento de formulário
 * travava porque o navegador registrava `EvalError: Content Security
 * Policy... 'unsafe-eval' is not an allowed source` e a hidratação nunca
 * terminava. `next build`/`next start` (produção) não usa `eval` nesse
 * devtool, então `allowUnsafeEval` some da CSP fora do dev — a política de
 * produção, a que protege usuários reais, continua tão restrita quanto a
 * seção 11 pede.
 *
 * Duas diretivas a mais, fora da lista literal da seção 11 mas necessárias
 * (mesmo critério do `apiOrigin` em `connect-src` acima) — confirmadas com
 * os mesmos testes E2E, rodando de verdade num browser (o que `curl`/testes
 * de componente isolados não pegam, porque nenhum dos dois aplica CSP):
 * - `style-src 'self' 'unsafe-inline'`: `CodeBlockView` (seção 5.2/11 —
 *   "Syntax highlight no servidor") renderiza cada token do Shiki como
 *   `<span style={{ color: token.color, ... }}>` (nunca
 *   `dangerouslySetInnerHTML`, ver o componente) — sem `style-src`, ele cai
 *   no fallback de `default-src 'self'`, que bloqueia `style=""` inteiro:
 *   o código exibido nas abas HTML/CSS/JS ficava sem nenhuma cor. Nonce não
 *   serve aqui — CSP3 não aplica `'nonce-...'`/hash a atributos `style`,
 *   só a elementos `<style>`/`<link>` (mensagem do próprio Chromium:
 *   "hashes do not apply to (...) style attributes unless 'unsafe-hashes'
 *   is present") — e hashear seria inviável (cor por token, infinitas
 *   combinações vindas do código de cada componente). `'unsafe-inline'`
 *   aqui é uma troca aceita amplamente: CSS injetado não executa código,
 *   só altera aparência — risco muito menor que `'unsafe-inline'` em
 *   `script-src` (que esta política nunca usa).
 * - `worker-src 'self' blob:`: o SDK do Clerk cria um Web Worker a partir
 *   de uma `blob:` URL (recurso interno dele, não documento nosso) — sem
 *   `worker-src`, a diretiva cai no fallback de `script-src`, que não
 *   inclui `blob:`, e o Chromium bloqueia a criação do worker.
 */
export interface ContentSecurityPolicyInput {
  nonce: string;
  clerkFrontendApiOrigin: string;
  apiOrigin: string;
  allowUnsafeEval: boolean;
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
  allowUnsafeEval,
}: ContentSecurityPolicyInput): string {
  const scriptSrc = ["'self'", `'nonce-${nonce}'`, clerkOrigin];
  if (allowUnsafeEval) {
    scriptSrc.push("'unsafe-eval'");
  }

  return [
    "default-src 'self'",
    "frame-src 'self' data:",
    "img-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline'",
    "worker-src 'self' blob:",
    `script-src ${scriptSrc.join(' ')}`,
    `connect-src 'self' ${clerkOrigin} ${apiOrigin}`,
  ].join('; ');
}

/** Nonce aleatório por request (Web Crypto — disponível no Edge Runtime do middleware). */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}
