import { describe, expect, it } from 'vitest';

import { renderPrompt, type RenderPromptInput } from './prompt.service.js';

const baseInput: RenderPromptInput = {
  name: 'Neon Toggle Switch',
  category: 'Toggle Switches',
  description: 'Um toggle com glow neon e transição suave.',
  technologies: ['HTML', 'CSS'],
  html: '<label class="switch"></label>',
  css: '.switch { display: block; }',
  js: null,
  promptTemplate: null,
  targetFramework: 'react',
  targetStyling: 'tailwind',
  sourceUrl: 'http://localhost:3000/components/neon-toggle-switch',
};

describe('renderPrompt', () => {
  it('substitui as variáveis do template global padrão', () => {
    const prompt = renderPrompt(baseInput);

    expect(prompt).toContain('Name: Neon Toggle Switch');
    expect(prompt).toContain('Category: Toggle Switches');
    expect(prompt).toContain('Description: Um toggle com glow neon e transição suave.');
    expect(prompt).toContain('Reference: http://localhost:3000/components/neon-toggle-switch');
    expect(prompt).toContain('<label class="switch"></label>');
    expect(prompt).toContain('.switch { display: block; }');
    expect(prompt).toContain('Framework: react');
    expect(prompt).toContain('Styling: tailwind');
  });

  it('omite o bloco {{#js}}...{{/js}} quando js é nulo', () => {
    const prompt = renderPrompt(baseInput);

    expect(prompt).not.toContain('```js');
    expect(prompt).not.toContain('{{#js}}');
    expect(prompt).not.toContain('{{/js}}');
  });

  it('inclui o bloco de JS quando o componente tem js', () => {
    const prompt = renderPrompt({ ...baseInput, js: 'console.log("toggle")' });

    expect(prompt).toContain('```js');
    expect(prompt).toContain('console.log("toggle")');
  });

  it('usa o promptTemplate do componente em vez do padrão, quando definido', () => {
    const prompt = renderPrompt({
      ...baseInput,
      promptTemplate: 'Custom prompt for {{name}} using {{technologies}}',
    });

    expect(prompt).toBe('Custom prompt for Neon Toggle Switch using HTML, CSS');
  });
});
