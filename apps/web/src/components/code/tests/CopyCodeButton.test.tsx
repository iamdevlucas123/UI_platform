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
const { CopyCodeButton } = await import('../CopyCodeButton');

afterEach(() => {
  cleanup();
  copyToClipboard.mockReset();
  vi.useRealTimers();
});

describe('CopyCodeButton — cópia bem-sucedida/falha (seção 5.2 do MVP2)', () => {
  it('copia HTML+CSS+JS no formato previsível e mostra status de sucesso', async () => {
    copyToClipboard.mockResolvedValue(true);
    render(<CopyCodeButton html="<p>x</p>" css="p{color:red}" js="let a=1;" />);

    fireEvent.click(screen.getByRole('button', { name: /Copy code/i }));

    await screen.findByRole('status');
    expect(screen.getByRole('status').textContent).toMatch(/Copied to clipboard/i);
    expect(copyToClipboard).toHaveBeenCalledWith(
      '/* HTML */\n<p>x</p>\n\n/* CSS */\np{color:red}\n\n/* JS */\nlet a=1;',
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('mostra status de erro quando a cópia falha (rejeição/indisponibilidade)', async () => {
    copyToClipboard.mockResolvedValue(false);
    render(<CopyCodeButton html="<p>x</p>" css="" js={null} />);

    fireEvent.click(screen.getByRole('button', { name: /Copy code/i }));

    await screen.findByRole('alert');
    expect(screen.getByRole('alert').textContent).toMatch(/Couldn.t copy/i);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('não inclui um cabeçalho "JS" quando `js` é null (formato previsível)', async () => {
    copyToClipboard.mockResolvedValue(true);
    render(<CopyCodeButton html="<p>x</p>" css="" js={null} />);

    fireEvent.click(screen.getByRole('button', { name: /Copy code/i }));

    await screen.findByRole('status');
    expect(copyToClipboard).toHaveBeenCalledWith('/* HTML */\n<p>x</p>');
  });

  it('volta ao estado neutro depois do status transitório', async () => {
    vi.useFakeTimers();
    copyToClipboard.mockResolvedValue(true);
    render(<CopyCodeButton html="<p>x</p>" css="" js={null} />);

    // `copyToClipboard` resolve via microtask (não um timer) — `act` com um
    // `await` dentro flush isso mesmo com fake timers ativos, sem depender
    // de `findByRole`/`waitFor` (que fariam polling via `setTimeout`, também
    // fake aqui).
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Copy code/i }));
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
