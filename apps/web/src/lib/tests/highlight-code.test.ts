import { describe, expect, it } from 'vitest';

import { highlightCode } from '../highlight-code';

describe('highlightCode (seção 3/5.2 do MVP2: highlight no servidor)', () => {
  it('devolve tokens estruturados (content/color), nunca uma string de HTML', async () => {
    const lines = await highlightCode('<b>x</b>', 'html');

    expect(Array.isArray(lines)).toBe(true);
    const flatContent = lines.flat().map((token) => token.content);
    // O código de exemplo reaparece token a token, nunca dentro de uma
    // única string de markup (o que indicaria um `codeToHtml`, não tokens).
    expect(flatContent.join('')).toContain('<b>x</b>');
    for (const token of lines.flat()) {
      expect(typeof token.content).toBe('string');
      expect(typeof token.bold).toBe('boolean');
      expect(typeof token.italic).toBe('boolean');
    }
  });

  it('quebra o código em uma linha por token[] de entrada (múltiplas linhas)', async () => {
    const lines = await highlightCode('.a{color:red}\n.b{color:blue}', 'css');

    expect(lines).toHaveLength(2);
    expect(lines[0]?.map((t) => t.content).join('')).toContain('.a');
    expect(lines[1]?.map((t) => t.content).join('')).toContain('.b');
  });

  it('tokeniza javascript para a linguagem "js"', async () => {
    const lines = await highlightCode("const n = 1;", 'js');

    const flatContent = lines.flat().map((token) => token.content).join('');
    expect(flatContent).toBe('const n = 1;');
  });

  it('lida com código vazio sem lançar', async () => {
    await expect(highlightCode('', 'css')).resolves.toBeDefined();
  });
});
