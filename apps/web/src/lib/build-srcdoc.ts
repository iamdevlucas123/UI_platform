/**
 * Monta o documento HTML do `srcdoc` do preview sandboxed (seção 8 do
 * MVP2). Este é o único lugar que decide o conteúdo do iframe — nunca é
 * injetado via `dangerouslySetInnerHTML` no DOM React (ver `SandboxPreview`);
 * `srcdoc` é uma propriedade própria do `<iframe>`, resolvida pelo próprio
 * navegador dentro da origem opaca do sandbox.
 */
export interface BuildSrcDocInput {
  html: string;
  css: string;
  /** Ausente/vazio omite a tag `<script>` — nem todo componente tem JS. */
  js?: string | null;
}

/**
 * Reset mínimo (seção 8): sem `background`, para que o elemento `<iframe>`
 * (não o documento interno) controle o fundo claro/escuro visível nas
 * áreas onde o componente não pinta nada — ver `SandboxPreview`.
 */
const RESET_CSS =
  '*,*::before,*::after{box-sizing:border-box;}html,body{margin:0;padding:0;min-height:100%;}body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;}';

/**
 * CSP do documento do preview (seção 8/11 do MVP2). Entregue via `<meta
 * http-equiv>`, então `frame-ancestors` e `sandbox` são ignorados pelo
 * spec nesse contexto — omitidos de propósito, não é um esquecimento.
 *
 * `script-src`/`style-src 'unsafe-inline'`: o HTML/CSS/JS do componente é
 * sempre inline (nunca um arquivo externo), então a política precisa
 * permitir isso para o componente funcionar — a defesa contra o conteúdo
 * inline é o `sandbox="allow-scripts"` sem `allow-same-origin` do iframe
 * (seção 8), não a CSP. A CSP aqui cobre a outra metade do risco: mesmo
 * que o script rode, ele não consegue chamar rede (`connect-src 'none'`)
 * nem enviar formulários (`form-action 'none'`) para fora do sandbox.
 */
const PREVIEW_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: https:",
  "font-src data:",
  "connect-src 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
].join('; ');

export function buildSrcDoc({ html, css, js }: BuildSrcDocInput): string {
  const hasJs = typeof js === 'string' && js.trim().length > 0;
  const scriptTag = hasJs ? `<script>${js}</script>` : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<style>${RESET_CSS}</style>
<style>${css}</style>
</head>
<body>
${html}
${scriptTag}
</body>
</html>`;
}
