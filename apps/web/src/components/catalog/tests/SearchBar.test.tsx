// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const replace = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/',
  useSearchParams: () => currentSearchParams,
}));

// Importado depois do mock acima, para pegar o `next/navigation` já mockado.
const { SearchBar } = await import('../SearchBar');

function getInput(): HTMLInputElement {
  return screen.getByLabelText('Search components by name or description') as HTMLInputElement;
}

/** Simula digitar `text` caractere a caractere, disparando um onChange por tecla. */
function type(input: HTMLInputElement, text: string): void {
  let current = input.value;
  for (const char of text) {
    current += char;
    fireEvent.change(input, { target: { value: current } });
  }
}

describe('SearchBar — debounce e URL (seção 5.1 do MVP2)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    replace.mockClear();
    currentSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('inicializa com o valor de ?q= já presente na URL', () => {
    currentSearchParams = new URLSearchParams('q=neon');
    render(<SearchBar />);

    expect(getInput().value).toBe('neon');
  });

  it('não chama router.replace imediatamente ao digitar (debounce de 300ms)', () => {
    render(<SearchBar />);

    type(getInput(), 'neon');

    expect(replace).not.toHaveBeenCalled();
    vi.advanceTimersByTime(299);
    expect(replace).not.toHaveBeenCalled();
  });

  it('chama router.replace com ?q= depois de 300ms sem digitar', () => {
    render(<SearchBar />);

    type(getInput(), 'neon');
    vi.advanceTimersByTime(300);

    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/?q=neon', { scroll: false });
  });

  it('usa router.replace (nunca push) para não criar histórico por tecla digitada', () => {
    render(<SearchBar />);

    type(getInput(), 'neon');
    vi.advanceTimersByTime(300);

    expect(replace).toHaveBeenCalled();
    // O componente não expõe `push` nenhuma vez — não há como "vazar" um
    // push acidental, já que `useRouter()` aqui só devolve `replace`.
  });

  it('cada tecla reinicia o debounce — só a pausa final gera uma chamada', () => {
    render(<SearchBar />);

    type(getInput(), 'ne');
    vi.advanceTimersByTime(250); // ainda dentro da janela de 300ms
    type(getInput(), 'on');
    vi.advanceTimersByTime(250); // de novo dentro da janela, reiniciada pela última tecla

    expect(replace).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/?q=neon', { scroll: false });
  });

  it('preserva os demais parâmetros da URL ao atualizar somente ?q=', () => {
    currentSearchParams = new URLSearchParams('category=buttons&sort=name');
    render(<SearchBar />);

    type(getInput(), 'x');
    vi.advanceTimersByTime(300);

    expect(replace).toHaveBeenCalledWith('/?category=buttons&sort=name&q=x', { scroll: false });
  });

  it('limpar a busca remove ?q= da URL', () => {
    currentSearchParams = new URLSearchParams('q=neon');
    render(<SearchBar />);

    fireEvent.change(getInput(), { target: { value: '' } });
    vi.advanceTimersByTime(300);

    expect(replace).toHaveBeenCalledWith('/', { scroll: false });
  });
});
