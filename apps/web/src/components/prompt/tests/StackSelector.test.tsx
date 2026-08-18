// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const getComponentPrompt = vi.fn();

vi.mock('@/lib/api-client', () => ({
  browserApi: { getComponentPrompt },
}));

// Importado depois do mock acima, para pegar `@/lib/api-client` já mockado.
const { StackSelector } = await import('../StackSelector');

interface PromptResponse {
  data: { prompt: string };
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function getFrameworkSelect(): HTMLSelectElement {
  return screen.getByLabelText('Framework') as HTMLSelectElement;
}

function getStylingSelect(): HTMLSelectElement {
  return screen.getByLabelText('Styling') as HTMLSelectElement;
}

afterEach(() => {
  cleanup();
  getComponentPrompt.mockReset();
});

describe('StackSelector — carregamento, erro e descarte de resposta obsoleta (seção 5.2/5.3 do MVP2)', () => {
  it('inicia com framework "react" e estilização "tailwind" (defaults do endpoint, seção 7 do MVP1)', () => {
    render(<StackSelector slug="neon-toggle" onPromptChange={vi.fn()} />);

    expect(getFrameworkSelect().value).toBe('react');
    expect(getStylingSelect().value).toBe('tailwind');
  });

  it('chama a API com o slug e a stack corretos ao trocar cada seletor', async () => {
    getComponentPrompt.mockResolvedValue({ data: { prompt: 'x' } } satisfies PromptResponse);
    render(<StackSelector slug="neon-toggle" onPromptChange={vi.fn()} />);

    await act(async () => {
      fireEvent.change(getFrameworkSelect(), { target: { value: 'vue' } });
      await Promise.resolve();
    });
    expect(getComponentPrompt).toHaveBeenLastCalledWith('neon-toggle', {
      framework: 'vue',
      styling: 'tailwind',
    });

    await act(async () => {
      fireEvent.change(getStylingSelect(), { target: { value: 'css' } });
      await Promise.resolve();
    });
    expect(getComponentPrompt).toHaveBeenLastCalledWith('neon-toggle', {
      framework: 'vue',
      styling: 'css',
    });
  });

  describe('carregamento', () => {
    it('sinaliza carregamento (indicador visível e onLoadingChange) durante a busca, e o encerra ao resolver', async () => {
      const deferred = createDeferred<PromptResponse>();
      getComponentPrompt.mockReturnValue(deferred.promise);
      const onLoadingChange = vi.fn();
      render(
        <StackSelector slug="neon-toggle" onPromptChange={vi.fn()} onLoadingChange={onLoadingChange} />,
      );

      fireEvent.change(getFrameworkSelect(), { target: { value: 'vue' } });

      expect(onLoadingChange).toHaveBeenCalledWith(true);
      expect(screen.getByRole('status').textContent).toMatch(/Updating prompt/i);

      await act(async () => {
        deferred.resolve({ data: { prompt: 'vue prompt' } });
        await Promise.resolve();
      });

      expect(onLoadingChange).toHaveBeenLastCalledWith(false);
      expect(screen.queryByRole('status')).toBeNull();
    });
  });

  describe('erro', () => {
    it('mostra uma mensagem de erro recuperável e preserva o último prompt válido', async () => {
      getComponentPrompt.mockRejectedValue(new Error('network down'));
      const onPromptChange = vi.fn();
      const onLoadingChange = vi.fn();
      render(
        <StackSelector slug="neon-toggle" onPromptChange={onPromptChange} onLoadingChange={onLoadingChange} />,
      );

      await act(async () => {
        fireEvent.change(getFrameworkSelect(), { target: { value: 'vue' } });
        await Promise.resolve();
      });

      expect(screen.getByRole('alert').textContent).toMatch(/Couldn.t update the prompt/i);
      // Nunca chama onPromptChange no caminho de erro — quem já está na tela continua lá.
      expect(onPromptChange).not.toHaveBeenCalled();
      expect(onLoadingChange).toHaveBeenLastCalledWith(false);
    });

    it('uma nova seleção bem-sucedida limpa o erro anterior', async () => {
      getComponentPrompt
        .mockResolvedValueOnce({ data: { prompt: 'x' } } satisfies PromptResponse)
        .mockRejectedValueOnce(new Error('network down'))
        .mockResolvedValueOnce({ data: { prompt: 'y' } } satisfies PromptResponse);
      render(<StackSelector slug="neon-toggle" onPromptChange={vi.fn()} />);

      await act(async () => {
        fireEvent.change(getStylingSelect(), { target: { value: 'css' } });
        await Promise.resolve();
      });
      await act(async () => {
        fireEvent.change(getStylingSelect(), { target: { value: 'css-modules' } });
        await Promise.resolve();
      });
      expect(screen.getByRole('alert')).toBeTruthy();

      await act(async () => {
        fireEvent.change(getStylingSelect(), { target: { value: 'styled-components' } });
        await Promise.resolve();
      });
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });

  describe('descarte de resposta obsoleta', () => {
    it('descarta uma resposta de sucesso antiga que chega depois de uma seleção mais nova', async () => {
      const first = createDeferred<PromptResponse>();
      const second = createDeferred<PromptResponse>();
      getComponentPrompt.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

      const onPromptChange = vi.fn();
      render(<StackSelector slug="neon-toggle" onPromptChange={onPromptChange} />);

      // Duas trocas rápidas antes de qualquer resposta chegar.
      fireEvent.change(getFrameworkSelect(), { target: { value: 'vue' } });
      fireEvent.change(getFrameworkSelect(), { target: { value: 'svelte' } });

      // Fora de ordem: a resposta da seleção mais NOVA ("svelte") chega
      // primeiro; a da seleção antiga ("vue") só resolve depois.
      await act(async () => {
        second.resolve({ data: { prompt: 'svelte prompt' } });
        await Promise.resolve();
      });
      await act(async () => {
        first.resolve({ data: { prompt: 'vue prompt (stale)' } });
        await Promise.resolve();
      });

      expect(onPromptChange).toHaveBeenCalledTimes(1);
      expect(onPromptChange).toHaveBeenCalledWith('svelte prompt');
    });

    it('descarta um erro antigo que chega depois de uma seleção mais nova já ter tido sucesso', async () => {
      const first = createDeferred<PromptResponse>();
      const second = createDeferred<PromptResponse>();
      getComponentPrompt.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

      render(<StackSelector slug="neon-toggle" onPromptChange={vi.fn()} />);

      fireEvent.change(getFrameworkSelect(), { target: { value: 'vue' } });
      fireEvent.change(getFrameworkSelect(), { target: { value: 'svelte' } });

      await act(async () => {
        second.resolve({ data: { prompt: 'svelte prompt' } });
        await Promise.resolve();
      });
      // A requisição antiga falha só depois da nova já ter tido sucesso —
      // não deve reintroduzir o banner de erro por cima do estado atual.
      await act(async () => {
        first.reject(new Error('stale network error'));
        await Promise.resolve();
      });

      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('não trava em carregamento se a requisição antiga resolver depois da mais nova', async () => {
      const first = createDeferred<PromptResponse>();
      const second = createDeferred<PromptResponse>();
      getComponentPrompt.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
      const onLoadingChange = vi.fn();

      render(
        <StackSelector slug="neon-toggle" onPromptChange={vi.fn()} onLoadingChange={onLoadingChange} />,
      );

      fireEvent.change(getFrameworkSelect(), { target: { value: 'vue' } });
      fireEvent.change(getFrameworkSelect(), { target: { value: 'svelte' } });

      await act(async () => {
        second.resolve({ data: { prompt: 'svelte prompt' } });
        await Promise.resolve();
      });
      expect(onLoadingChange).toHaveBeenLastCalledWith(false);
      expect(screen.queryByRole('status')).toBeNull();

      onLoadingChange.mockClear();
      await act(async () => {
        first.resolve({ data: { prompt: 'vue prompt (stale)' } });
        await Promise.resolve();
      });

      // A resolução antiga não deve reacionar onLoadingChange nem reabrir o indicador.
      expect(onLoadingChange).not.toHaveBeenCalled();
      expect(screen.queryByRole('status')).toBeNull();
    });
  });
});
