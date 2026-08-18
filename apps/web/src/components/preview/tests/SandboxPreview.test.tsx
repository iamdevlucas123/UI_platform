// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { SandboxPreview } from '../SandboxPreview';

afterEach(() => cleanup());

describe('SandboxPreview — configuração segura do iframe (seção 8 do MVP2)', () => {
  it('usa sandbox="allow-scripts" exatamente, sem allow-same-origin nem outros tokens', () => {
    render(<SandboxPreview html="<p>hi</p>" css="" />);

    const iframe = screen.getByTitle('Live component preview');
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
    expect(iframe.getAttribute('sandbox')).not.toContain('allow-same-origin');
  });

  it('não define o atributo "allow" (nenhuma permissão extra de Permissions Policy)', () => {
    render(<SandboxPreview html="<p>hi</p>" css="" />);

    expect(screen.getByTitle('Live component preview').getAttribute('allow')).toBeNull();
  });

  it('define referrerPolicy="no-referrer"', () => {
    render(<SandboxPreview html="<p>hi</p>" css="" />);

    expect(screen.getByTitle('Live component preview').getAttribute('referrerpolicy')).toBe('no-referrer');
  });

  it('passa o HTML/CSS/JS via srcDoc (propriedade do elemento), não via dangerouslySetInnerHTML', () => {
    render(<SandboxPreview html="<button>Click</button>" css=".x{color:red}" js="1+1" />);

    const iframe = screen.getByTitle('Live component preview') as HTMLIFrameElement;
    expect(iframe.srcdoc).toContain('<button>Click</button>');
    expect(iframe.srcdoc).toContain('.x{color:red}');
    expect(iframe.srcdoc).toContain('<script>1+1</script>');
    // srcDoc nunca deve conter marcação escapada de dangerouslySetInnerHTML
    // (o React não teria como escapar isto de qualquer forma — srcDoc é uma
    // propriedade IDL, não innerHTML — mas o teste documenta a intenção).
    expect(iframe.innerHTML).toBe('');
  });

  it('alterna a classe de fundo entre claro (padrão) e escuro', () => {
    const { rerender } = render(<SandboxPreview html="<p>hi</p>" css="" />);
    expect(screen.getByTitle('Live component preview').classList.contains('bg-white')).toBe(true);

    rerender(<SandboxPreview html="<p>hi</p>" css="" background="dark" />);
    expect(screen.getByTitle('Live component preview').classList.contains('bg-neutral-950')).toBe(true);
  });

  it('aceita className para controlar tamanho/posicionamento externo', () => {
    render(<SandboxPreview html="<p>hi</p>" css="" className="h-40 w-full rounded-lg" />);

    const classList = screen.getByTitle('Live component preview').classList;
    expect(classList.contains('h-40')).toBe(true);
    expect(classList.contains('w-full')).toBe(true);
    expect(classList.contains('rounded-lg')).toBe(true);
  });
});
