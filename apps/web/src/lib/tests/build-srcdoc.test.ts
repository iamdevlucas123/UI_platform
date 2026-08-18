import { describe, expect, it } from 'vitest';

import { buildSrcDoc } from '../build-srcdoc';

describe('buildSrcDoc', () => {
  it('inclui meta charset, o CSS do componente e o HTML', () => {
    const doc = buildSrcDoc({
      html: '<button class="btn">Click</button>',
      css: '.btn{color:red;}',
    });

    expect(doc).toContain('<meta charset="utf-8">');
    expect(doc).toContain('.btn{color:red;}');
    expect(doc).toContain('<button class="btn">Click</button>');
  });

  it('inclui o reset curto antes do CSS do componente', () => {
    const doc = buildSrcDoc({ html: '<p>x</p>', css: 'p{margin:0;}' });

    const resetIndex = doc.indexOf('box-sizing:border-box');
    const componentCssIndex = doc.indexOf('p{margin:0;}');
    expect(resetIndex).toBeGreaterThan(-1);
    expect(componentCssIndex).toBeGreaterThan(resetIndex);
  });

  it('adiciona a tag <script> quando js é uma string não vazia', () => {
    const doc = buildSrcDoc({ html: '<p>x</p>', css: '', js: "console.log('hi')" });

    expect(doc).toContain("<script>console.log('hi')</script>");
  });

  it.each([undefined, null, '', '   '])('omite <script> quando js é %p', (js) => {
    const doc = buildSrcDoc({ html: '<p>x</p>', css: '', js });

    expect(doc).not.toContain('<script>');
  });

  it('inclui uma CSP bloqueando conexões de rede e envio de formulários', () => {
    const doc = buildSrcDoc({ html: '<p>x</p>', css: '' });

    expect(doc).toContain('Content-Security-Policy');
    expect(doc).toContain("connect-src 'none'");
    expect(doc).toContain("form-action 'none'");
    expect(doc).toContain("default-src 'none'");
    expect(doc).toContain("object-src 'none'");
    expect(doc).toContain("base-uri 'none'");
  });

  it('permite script inline na CSP — o JS do componente precisa poder rodar', () => {
    const doc = buildSrcDoc({ html: '<p>x</p>', css: '', js: '1+1' });

    expect(doc).toContain("script-src 'unsafe-inline'");
  });

  it('a CSP <meta> vem antes de qualquer <style>/<script> no documento', () => {
    const doc = buildSrcDoc({ html: '<p>x</p>', css: 'p{color:blue;}', js: '1+1' });

    const cspIndex = doc.indexOf('Content-Security-Policy');
    const styleIndex = doc.indexOf('<style>');
    const scriptIndex = doc.indexOf('<script>');

    expect(cspIndex).toBeGreaterThan(-1);
    expect(cspIndex).toBeLessThan(styleIndex);
    expect(cspIndex).toBeLessThan(scriptIndex);
  });

  it('não define background no reset — o fundo é controlado fora do documento', () => {
    const doc = buildSrcDoc({ html: '<p>x</p>', css: '' });
    const resetBlock = doc.slice(doc.indexOf('<style>'), doc.indexOf('</style>'));

    expect(resetBlock).not.toContain('background');
  });
});
