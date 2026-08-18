/**
 * Cópia para a área de transferência (seção 5.2 do MVP2: "Copy Code"/"Copy
 * AI Prompt"). `navigator.clipboard.writeText` tanto pode não existir
 * (indisponibilidade — contexto não seguro, navegador antigo) quanto
 * rejeitar (permissão negada) — os dois casos viram `false`, nunca uma
 * exceção não tratada, para o chamador só precisar de um `if`.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export interface ComponentCodeSections {
  html: string;
  css: string;
  js?: string | null;
}

/**
 * Formato previsível do botão "Copy Code" (seção 5.2 do MVP2): concatena
 * HTML, CSS e JS com um cabeçalho `/* LABEL *\/` por trecho — só para
 * trechos presentes (JS ausente/vazio não gera um cabeçalho "/* JS *\/"
 * vazio; o mesmo vale para HTML/CSS em branco, embora o schema do
 * componente já garanta HTML não-vazio).
 */
export function formatComponentCode({ html, css, js }: ComponentCodeSections): string {
  const sections: Array<{ label: string; content: string }> = [];

  if (html.trim().length > 0) {
    sections.push({ label: 'HTML', content: html.trim() });
  }
  if (css.trim().length > 0) {
    sections.push({ label: 'CSS', content: css.trim() });
  }
  if (js && js.trim().length > 0) {
    sections.push({ label: 'JS', content: js.trim() });
  }

  return sections.map(({ label, content }) => `/* ${label} */\n${content}`).join('\n\n');
}
