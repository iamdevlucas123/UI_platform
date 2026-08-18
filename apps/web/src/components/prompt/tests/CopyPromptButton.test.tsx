// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const copyToClipboard = vi.fn();

vi.mock('@/lib/copy-to-clipboard', async () => {
  const actual = await vi.importActual<typeof import('@/lib/copy-to-clipboard')>('@/lib/copy-to-clipboard');
  return {
    ...actual,
    copyToClipboard,
  };
});

// Importado depois do mock acima, para pegar `@/lib/copy-to-clipboard` já mockado.
const { CopyPromptButton } = await import('../CopyPromptButton');

const PROMPT_TEXT = 'Implement this exact component using React + Tailwind CSS.\n\n<html omitted>';

afterEach(() => {
  cleanup();
  copyToClipboard.mockReset();
  vi.useRealTimers();
});

describe('CopyPromptButton — clipboard e toast (seção 5.3 do MVP2)', () => {
  it('copia o prompt exatamente como recebido via props, sem interpolação', async () => {
    copyToClipboard.mockResolvedValue(true);
    render(<CopyPromptButton prompt={PROMPT_TEXT} />);

    fireEvent.click(screen.getByRole('button', { name: /Copy AI Prompt/i }));

    await screen.findByRole('status');
    // Chamado com o texto idêntico ao prop — nenhuma formatação/concatenação
    // (ao contrário de `CopyCodeButton`, que monta um formato próprio).
    expect(copyToClipboard).toHaveBeenCalledWith(PROMPT_TEXT);
    expect(copyToClipboard).toHaveBeenCalledTimes(1);
  });

  it('mostra toast de sucesso quando a cópia funciona', async () => {
    copyToClipboard.mockResolvedValue(true);
    render(<CopyPromptButton prompt={PROMPT_TEXT} />);

    fireEvent.click(screen.getByRole('button', { name: /Copy AI Prompt/i }));

    await screen.findByRole('status');
    expect(screen.getByRole('status').textContent).toMatch(/Copied to clipboard/i);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('mostra toast de erro quando a cópia falha (rejeição/indisponibilidade)', async () => {
    copyToClipboard.mockResolvedValue(false);
    render(<CopyPromptButton prompt={PROMPT_TEXT} />);

    fireEvent.click(screen.getByRole('button', { name: /Copy AI Prompt/i }));

    await screen.findByRole('alert');
    expect(screen.getByRole('alert').textContent).toMatch(/Couldn.t copy/i);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('fica desabilitado quando `disabled` é true (nunca copiar durante a atualização)', () => {
    render(<CopyPromptButton prompt={PROMPT_TEXT} disabled />);

    const button = screen.getByRole('button', { name: /Copy AI Prompt/i }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('copia o prompt atualizado (props) depois de uma troca de stack, não o inicial', async () => {
    copyToClipboard.mockResolvedValue(true);
    const { rerender } = render(<CopyPromptButton prompt="initial prompt" />);

    rerender(<CopyPromptButton prompt="updated prompt for vue + css" />);
    fireEvent.click(screen.getByRole('button', { name: /Copy AI Prompt/i }));

    await screen.findByRole('status');
    expect(copyToClipboard).toHaveBeenCalledWith('updated prompt for vue + css');
  });

  it('volta ao estado neutro depois do status transitório', async () => {
    vi.useFakeTimers();
    copyToClipboard.mockResolvedValue(true);
    render(<CopyPromptButton prompt={PROMPT_TEXT} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Copy AI Prompt/i }));
      await Promise.resolve();
    });

    expect(screen.getByRole('status')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
