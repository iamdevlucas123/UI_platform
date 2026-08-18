/**
 * Serializa dados estruturados para um `<script type="application/ld+json">`
 * com segurança (seção 5.2 do MVP2). `JSON.stringify` já escapa aspas/barras
 * invertidas/caracteres de controle; o único risco restante num `<script>`
 * é uma sequência `</script` dentro do JSON (ex.: vinda de `description`)
 * fechar a tag prematuramente e injetar markup no documento — escapado aqui
 * trocando o caractere `<` pela sequência de escape Unicode equivalente.
 *
 * O `<script>` em si recebe este texto como filho comum do React (`{...}`),
 * nunca via `dangerouslySetInnerHTML`: para um elemento `<script>`, texto
 * filho é sempre tratado como dado/JS-fonte pelo navegador, não como HTML —
 * a mesma garantia de segurança, sem a API perigosa.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
