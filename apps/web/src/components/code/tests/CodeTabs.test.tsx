// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const highlightCode = vi.fn();

vi.mock('@/lib/highlight-code', () => ({
  highlightCode,
}));

// Importado depois do mock acima, para pegar `@/lib/highlight-code` já mockado.
const { CodeTabs } = await import('../CodeTabs');

afterEach(() => {
  cleanup();
  highlightCode.mockReset();
});

function stubHighlightCode(): void {
  highlightCode.mockImplementation(async (code: string) => [[{ content: code, bold: false, italic: false }]]);
}

describe('CodeTabs — aba JS condicional (seção 5.2 do MVP2)', () => {
  it('não renderiza a aba JS quando `js` é null', async () => {
    stubHighlightCode();
    const element = await CodeTabs({ html: '<button>Hi</button>', css: 'button{color:red}', js: null });
    render(element);

    expect(screen.getByRole('tab', { name: 'HTML' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'CSS' })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'JS' })).toBeNull();
  });

  it('não renderiza a aba JS quando `js` é uma string vazia/só espaços', async () => {
    stubHighlightCode();
    const element = await CodeTabs({ html: '<button>Hi</button>', css: '', js: '   ' });
    render(element);

    expect(screen.queryByRole('tab', { name: 'JS' })).toBeNull();
  });

  it('renderiza a aba JS quando `js` tem conteúdo', async () => {
    stubHighlightCode();
    const element = await CodeTabs({
      html: '<button>Hi</button>',
      css: 'button{color:red}',
      js: "console.log('hi')",
    });
    render(element);

    expect(screen.getByRole('tab', { name: 'JS' })).toBeTruthy();
  });

  it('chama highlightCode com a linguagem correta para cada aba presente', async () => {
    stubHighlightCode();
    await CodeTabs({ html: '<p>x</p>', css: 'p{}', js: 'let a=1;' });

    expect(highlightCode).toHaveBeenCalledWith('<p>x</p>', 'html');
    expect(highlightCode).toHaveBeenCalledWith('p{}', 'css');
    expect(highlightCode).toHaveBeenCalledWith('let a=1;', 'js');
  });

  it('a aba HTML começa ativa; trocar de aba mostra o painel correspondente', async () => {
    highlightCode.mockImplementation(async (code: string, lang: string) => [
      [{ content: `${lang}:${code}`, bold: false, italic: false }],
    ]);
    const element = await CodeTabs({ html: '<p>a</p>', css: 'p{color:red}', js: null });
    const { container } = render(element);

    expect(screen.getByText('html:<p>a</p>')).toBeTruthy();
    expect(container.querySelector('#code-panel-css')).toHaveProperty('hidden', true);

    fireEvent.click(screen.getByRole('tab', { name: 'CSS' }));

    expect(container.querySelector('#code-panel-html')).toHaveProperty('hidden', true);
    expect(container.querySelector('#code-panel-css')).toHaveProperty('hidden', false);
  });
});
