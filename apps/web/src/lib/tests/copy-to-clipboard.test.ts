import { afterEach, describe, expect, it, vi } from 'vitest';

import { copyToClipboard, formatComponentCode } from '../copy-to-clipboard';

describe('formatComponentCode (seção 5.2 do MVP2: formato previsível do "Copy Code")', () => {
  it('inclui HTML, CSS e JS com cabeçalhos separados quando os três estão presentes', () => {
    const result = formatComponentCode({
      html: '<button>Hi</button>',
      css: 'button{color:red}',
      js: "console.log('hi')",
    });

    expect(result).toBe(
      '/* HTML */\n<button>Hi</button>\n\n/* CSS */\nbutton{color:red}\n\n/* JS */\nconsole.log(\'hi\')',
    );
  });

  it('omite o cabeçalho JS quando `js` é null', () => {
    const result = formatComponentCode({ html: '<p>x</p>', css: 'p{margin:0}', js: null });

    expect(result).toBe('/* HTML */\n<p>x</p>\n\n/* CSS */\np{margin:0}');
    expect(result).not.toContain('JS');
  });

  it('omite o cabeçalho JS quando `js` é uma string vazia/só espaços', () => {
    const result = formatComponentCode({ html: '<p>x</p>', css: '', js: '   ' });

    expect(result).not.toContain('JS');
  });

  it('omite o cabeçalho CSS quando `css` é uma string vazia', () => {
    const result = formatComponentCode({ html: '<p>x</p>', css: '', js: null });

    expect(result).toBe('/* HTML */\n<p>x</p>');
  });

  it('remove espaço em branco nas pontas de cada trecho', () => {
    const result = formatComponentCode({ html: '  <p>x</p>  \n', css: '', js: null });

    expect(result).toBe('/* HTML */\n<p>x</p>');
  });
});

describe('copyToClipboard (seção 5.2 do MVP2)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('devolve true quando navigator.clipboard.writeText resolve', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(copyToClipboard('hello')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('devolve false quando navigator.clipboard.writeText rejeita (ex.: permissão negada)', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('permission denied'));
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(copyToClipboard('hello')).resolves.toBe(false);
  });

  it('devolve false quando a Clipboard API está indisponível', async () => {
    vi.stubGlobal('navigator', {});

    await expect(copyToClipboard('hello')).resolves.toBe(false);
  });
});
