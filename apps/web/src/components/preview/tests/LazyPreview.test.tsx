// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LazyPreview } from '../LazyPreview';

type ObserverCallback = (entries: Array<{ isIntersecting: boolean }>) => void;

/** Substitui o `IntersectionObserver` real (indisponível no jsdom) por um dublê controlável. */
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: ObserverCallback;
  disconnected = false;

  constructor(callback: ObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe(): void {}

  disconnect(): void {
    this.disconnected = true;
  }

  unobserve(): void {}

  trigger(isIntersecting: boolean): void {
    this.callback([{ isIntersecting }]);
  }
}

afterEach(() => {
  cleanup();
  MockIntersectionObserver.instances = [];
  vi.unstubAllGlobals();
});

describe('LazyPreview — carregamento sob demanda (seção 8 do MVP2)', () => {
  it('renderiza o skeleton antes de o card estar visível, sem montar o iframe', () => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver as unknown as typeof IntersectionObserver);

    render(<LazyPreview html="<p>hi</p>" css="" />);

    expect(screen.getByTestId('preview-skeleton')).toBeTruthy();
    expect(screen.queryByTitle('Live component preview')).toBeNull();
  });

  it('monta o SandboxPreview (com srcDoc) quando o IntersectionObserver reporta interseção', () => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver as unknown as typeof IntersectionObserver);

    render(<LazyPreview html="<button>Click</button>" css="" />);
    const [observer] = MockIntersectionObserver.instances;

    act(() => observer?.trigger(true));

    const iframe = screen.getByTitle('Live component preview') as HTMLIFrameElement;
    expect(iframe.srcdoc).toContain('<button>Click</button>');
    expect(screen.queryByTestId('preview-skeleton')).toBeNull();
  });

  it('não monta o preview enquanto a interseção reportada é false', () => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver as unknown as typeof IntersectionObserver);

    render(<LazyPreview html="<p>hi</p>" css="" />);
    const [observer] = MockIntersectionObserver.instances;

    act(() => observer?.trigger(false));

    expect(screen.getByTestId('preview-skeleton')).toBeTruthy();
    expect(screen.queryByTitle('Live component preview')).toBeNull();
  });

  it('desconecta o observer assim que o preview fica visível (não fica observando para sempre)', () => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver as unknown as typeof IntersectionObserver);

    render(<LazyPreview html="<p>hi</p>" css="" />);
    const [observer] = MockIntersectionObserver.instances;

    act(() => observer?.trigger(true));

    expect(observer?.disconnected).toBe(true);
  });

  it('fallback seguro: sem suporte a IntersectionObserver no ambiente, renderiza direto', () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    render(<LazyPreview html="<p>hi</p>" css="" />);

    expect(screen.getByTitle('Live component preview')).toBeTruthy();
    expect(screen.queryByTestId('preview-skeleton')).toBeNull();
  });
});
