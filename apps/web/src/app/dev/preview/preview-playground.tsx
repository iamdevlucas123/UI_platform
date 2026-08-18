'use client';

import { useState } from 'react';

import { LazyPreview } from '@/components/preview/LazyPreview';
import { SandboxPreview, type PreviewBackground } from '@/components/preview/SandboxPreview';
import { ThemeToggle } from '@/components/preview/ThemeToggle';

/** HTML + CSS + JS de exemplo — valida os três juntos, como pede a seção 8. */
const BUTTON_EXAMPLE = {
  html: '<button class="btn" type="button">Click me <span id="count">0</span></button>',
  css: '.btn{font:600 15px system-ui;padding:12px 22px;border-radius:999px;border:none;background:linear-gradient(135deg,#6366f1,#ec4899);color:#fff;cursor:pointer;box-shadow:0 8px 20px rgba(99,102,241,.35);}.btn:active{transform:scale(.97);}',
  js: "let n=0;document.querySelector('.btn').addEventListener('click',()=>{n++;document.getElementById('count').textContent=String(n);});",
};

const HTML_ONLY_EXAMPLE = {
  html: '<p style="font:14px system-ui;padding:16px;">HTML puro, sem CSS/JS — a aba JS correspondente não deve existir na página de detalhe.</p>',
  css: '',
};

/**
 * Tenta uma chamada de rede de dentro do sandbox — deve sempre falhar por
 * causa do `connect-src 'none'` da CSP do documento (ver `build-srcdoc.ts`).
 * Serve para verificar visualmente, nesta rota, que o bloqueio realmente
 * funciona antes de seguir para o catálogo.
 */
const CSP_CHECK_EXAMPLE = {
  html: '<div id="result">Testing network access…</div>',
  css: 'body{font:13px ui-monospace,monospace;padding:16px;}#result{padding:10px 14px;border-radius:8px;background:#f1f5f9;color:#0f172a;}',
  js: "fetch('https://example.com').then(()=>{document.getElementById('result').textContent='fetch succeeded — CSP is NOT blocking (bug)';}).catch((e)=>{document.getElementById('result').textContent='fetch blocked as expected: '+e.message;});",
};

const STRESS_GRID_ITEMS = Array.from({ length: 24 }, (_, index) => index);

const PREVIEW_BOX = 'h-40 w-full rounded-lg border border-neutral-200';

export function PreviewPlayground() {
  const [background, setBackground] = useState<PreviewBackground>('light');

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-12 p-6 sm:p-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">Preview sandbox — dev only</h1>
        <p className="text-sm text-neutral-500">
          Rota interna (seção 8 do MVP2), sem index, para validar `SandboxPreview` e `LazyPreview`
          isoladamente antes de existir qualquer página de catálogo.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium">SandboxPreview — HTML + CSS + JS, montado imediatamente</h2>
          <ThemeToggle value={background} onChange={setBackground} />
        </div>
        <SandboxPreview {...BUTTON_EXAMPLE} background={background} className={PREVIEW_BOX} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">SandboxPreview — só HTML (sem CSS/JS)</h2>
        <SandboxPreview {...HTML_ONLY_EXAMPLE} background={background} className={PREVIEW_BOX} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">
          CSP do sandbox — a chamada de rede abaixo deve sempre ser bloqueada
        </h2>
        <SandboxPreview {...CSP_CHECK_EXAMPLE} background={background} className={PREVIEW_BOX} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">LazyPreview — abaixo da dobra, role para carregar</h2>
        <div className="flex h-[120vh] items-center justify-center rounded-lg border border-dashed border-neutral-300 text-sm text-neutral-400">
          Role para baixo — o preview abaixo só recebe `srcDoc` ao entrar no viewport
        </div>
        <LazyPreview {...BUTTON_EXAMPLE} background={background} className={PREVIEW_BOX} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Grid com 24 LazyPreview — teste de carga/mobile</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {STRESS_GRID_ITEMS.map((index) => (
            <LazyPreview
              key={index}
              {...BUTTON_EXAMPLE}
              background={background}
              className="h-28 w-full rounded-lg border border-neutral-200"
            />
          ))}
        </div>
      </section>
    </main>
  );
}
