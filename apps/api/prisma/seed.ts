import { ComponentStatus, PrismaClient } from '@prisma/client';

/**
 * Script de seed (MVP1, seção 6): popula as 14 categorias iniciais, na
 * ordem definida, e componentes de exemplo publicados — suficiente para
 * desenvolver o frontend na próxima etapa sem cadastro manual. Todo upsert é
 * feito por `slug`, então rodar o script várias vezes é seguro (idempotente).
 *
 * Instanciado localmente (não reaproveita `src/lib/prisma.ts`): este script
 * roda como processo isolado via `tsx prisma/seed.ts`, então gerencia seu
 * próprio ciclo de vida de conexão do início ao fim.
 */
const prisma = new PrismaClient();

/** As 14 categorias iniciais, na ordem exata do MVP1 (seção 6). */
const CATEGORIES = [
  'Animation',
  'Text Animation',
  'Buttons',
  'Components',
  'Checkboxes',
  'Toggle Switches',
  'Cards',
  'Loaders',
  'Inputs',
  'Radio Buttons',
  'Forms',
  'Patterns',
  'Tooltips',
  'UI Kits',
] as const;

type CategoryName = (typeof CATEGORIES)[number];

/** Slugs derivados manualmente (kebab-case) — não há rota implementada ainda. */
const CATEGORY_SLUGS: Record<CategoryName, string> = {
  Animation: 'animation',
  'Text Animation': 'text-animation',
  Buttons: 'buttons',
  Components: 'components',
  Checkboxes: 'checkboxes',
  'Toggle Switches': 'toggle-switches',
  Cards: 'cards',
  Loaders: 'loaders',
  Inputs: 'inputs',
  'Radio Buttons': 'radio-buttons',
  Forms: 'forms',
  Patterns: 'patterns',
  Tooltips: 'tooltips',
  'UI Kits': 'ui-kits',
};

interface SeedComponent {
  name: string;
  slug: string;
  description: string;
  html: string;
  css: string;
  js?: string;
  technologies: string[];
}

/** Dois componentes de exemplo, válidos e publicáveis, por categoria. */
const COMPONENTS_BY_CATEGORY: Record<CategoryName, SeedComponent[]> = {
  Animation: [
    {
      name: 'Fade In Card',
      slug: 'fade-in-card',
      description:
        'Cartão que aparece com um leve movimento vertical e fade, ideal para revelar conteúdo ao carregar a página.',
      html: '<div class="fade-card">\n  <h3>Fade In Card</h3>\n  <p>This card fades and lifts into view.</p>\n</div>',
      css: `.fade-card {
  max-width: 280px;
  padding: 24px;
  border-radius: 12px;
  background: #111827;
  color: #f9fafb;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  animation: fadeInUp 0.6s ease-out both;
}

.fade-card h3 {
  margin: 0 0 8px;
  font-size: 1.1rem;
}

.fade-card p {
  margin: 0;
  font-size: 0.9rem;
  color: #9ca3af;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}`,
      technologies: ['HTML', 'CSS', 'CSS Animation'],
    },
    {
      name: 'Slide In Banner',
      slug: 'slide-in-banner',
      description: 'Banner de aviso que desliza da esquerda para a direita ao entrar na tela.',
      html: '<div class="slide-banner">\n  <span>New release is live — check it out!</span>\n</div>',
      css: `.slide-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 20px;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  color: #fff;
  font-weight: 600;
  border-radius: 8px;
  animation: slideInLeft 0.5s ease-out both;
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-24px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}`,
      technologies: ['HTML', 'CSS', 'CSS Animation'],
    },
  ],
  'Text Animation': [
    {
      name: 'Typewriter Text',
      slug: 'typewriter-text',
      description:
        'Texto digitado letra a letra com cursor piscante, usando um pequeno script para revelar o conteúdo de data-text.',
      html: '<p class="typewriter" data-text="Building beautiful interfaces."></p>',
      css: `.typewriter {
  font-family: 'Courier New', monospace;
  font-size: 1.1rem;
  color: #111827;
  border-right: 2px solid #111827;
  padding-right: 4px;
  animation: blink 0.7s step-end infinite;
}

@keyframes blink {
  50% {
    border-color: transparent;
  }
}`,
      js: `const el = document.querySelector('.typewriter');
const text = el.dataset.text || '';
let i = 0;

function type() {
  if (i <= text.length) {
    el.textContent = text.slice(0, i);
    i += 1;
    setTimeout(type, 45);
  }
}

type();`,
      technologies: ['HTML', 'CSS', 'JavaScript'],
    },
    {
      name: 'Gradient Text Shine',
      slug: 'gradient-text-shine',
      description:
        'Título com gradiente animado que se move continuamente, criando um efeito de brilho no texto.',
      html: '<h2 class="shine-text">Shine Bright</h2>',
      css: `.shine-text {
  margin: 0;
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(90deg, #f472b6, #facc15, #38bdf8, #f472b6);
  background-size: 300% auto;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: shine 4s linear infinite;
}

@keyframes shine {
  to {
    background-position: 300% center;
  }
}`,
      technologies: ['HTML', 'CSS', 'CSS Animation'],
    },
  ],
  Buttons: [
    {
      name: 'Gradient Hover Button',
      slug: 'gradient-hover-button',
      description:
        'Botão com gradiente que desliza ao passar o mouse, acompanhado de um leve efeito de elevação.',
      html: '<button class="gradient-btn">Get Started</button>',
      css: `.gradient-btn {
  padding: 12px 28px;
  border: none;
  border-radius: 999px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(90deg, #6366f1, #ec4899);
  background-size: 200% auto;
  cursor: pointer;
  transition: background-position 0.4s ease, transform 0.2s ease;
}

.gradient-btn:hover {
  background-position: right center;
  transform: translateY(-2px);
}`,
      technologies: ['HTML', 'CSS'],
    },
    {
      name: 'Ripple Click Button',
      slug: 'ripple-click-button',
      description:
        'Botão que cria um efeito de ondulação (ripple) a partir do ponto exato do clique do usuário.',
      html: '<button class="ripple-btn">Click Me</button>',
      css: `.ripple-btn {
  position: relative;
  overflow: hidden;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  font-size: 0.95rem;
  cursor: pointer;
}

.ripple-btn .ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  transform: scale(0);
  animation: ripple 0.6s linear;
  pointer-events: none;
}

@keyframes ripple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}`,
      js: `const button = document.querySelector('.ripple-btn');

button.addEventListener('click', (event) => {
  const circle = document.createElement('span');
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const rect = button.getBoundingClientRect();

  circle.style.width = circle.style.height = \`\${diameter}px\`;
  circle.style.left = \`\${event.clientX - rect.left - diameter / 2}px\`;
  circle.style.top = \`\${event.clientY - rect.top - diameter / 2}px\`;
  circle.classList.add('ripple');

  button.appendChild(circle);
  circle.addEventListener('animationend', () => circle.remove());
});`,
      technologies: ['HTML', 'CSS', 'JavaScript'],
    },
  ],
  Components: [
    {
      name: 'Alert Banner',
      slug: 'alert-banner',
      description:
        'Faixa de aviso simples para comunicar mensagens de status ou alertas contextuais ao usuário.',
      html: '<div class="alert-banner">\n  <strong>Heads up!</strong>\n  <span>Your trial ends in 3 days.</span>\n</div>',
      css: `.alert-banner {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 14px 18px;
  border-radius: 10px;
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
  font-size: 0.9rem;
}`,
      technologies: ['HTML', 'CSS'],
    },
    {
      name: 'Badge Counter',
      slug: 'badge-counter',
      description:
        'Ícone de notificação com um contador sobreposto no canto, indicando itens pendentes.',
      html: '<button class="icon-btn">\n  🔔\n  <span class="badge">5</span>\n</button>',
      css: `.icon-btn {
  position: relative;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: #f3f4f6;
  font-size: 1.2rem;
  cursor: pointer;
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 0.7rem;
  line-height: 18px;
  text-align: center;
}`,
      technologies: ['HTML', 'CSS'],
    },
  ],
  Checkboxes: [
    {
      name: 'Custom Checkbox',
      slug: 'custom-checkbox',
      description:
        'Checkbox estilizado que substitui o input nativo por uma caixa customizada com estado marcado.',
      html: '<label class="custom-checkbox">\n  <input type="checkbox" />\n  <span class="box"></span>\n  Remember me\n</label>',
      css: `.custom-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
  cursor: pointer;
}

.custom-checkbox input {
  display: none;
}

.custom-checkbox .box {
  width: 20px;
  height: 20px;
  border: 2px solid #9ca3af;
  border-radius: 4px;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.custom-checkbox input:checked + .box {
  background: #4f46e5;
  border-color: #4f46e5;
}`,
      technologies: ['HTML', 'CSS'],
    },
    {
      name: 'Animated Checkbox',
      slug: 'animated-checkbox',
      description:
        'Checkbox com um ícone de check desenhado via SVG que se anima ao ser marcado.',
      html: '<label class="animated-checkbox">\n  <input type="checkbox" />\n  <svg viewBox="0 0 24 24">\n    <polyline points="4,12 9,17 20,6" />\n  </svg>\n  Accept terms\n</label>',
      css: `.animated-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
  cursor: pointer;
}

.animated-checkbox input {
  display: none;
}

.animated-checkbox svg {
  width: 22px;
  height: 22px;
  border: 2px solid #9ca3af;
  border-radius: 4px;
  padding: 2px;
}

.animated-checkbox svg polyline {
  fill: none;
  stroke: #10b981;
  stroke-width: 3;
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  transition: stroke-dashoffset 0.3s ease;
}

.animated-checkbox input:checked ~ svg polyline {
  stroke-dashoffset: 0;
}

.animated-checkbox input:checked ~ svg {
  border-color: #10b981;
}`,
      technologies: ['HTML', 'CSS', 'SVG'],
    },
  ],
  'Toggle Switches': [
    {
      // Exemplo do próprio MVP1 (seção 7): mesmo name/slug/description do
      // payload de referência de POST /api/admin/components.
      name: 'Neon Toggle Switch',
      slug: 'neon-toggle-switch',
      description: 'Um toggle com glow neon e transição suave.',
      html: '<label class="switch">\n  <input type="checkbox" />\n  <span class="slider"></span>\n</label>',
      css: `.switch {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  inset: 0;
  background: #1f2937;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.3s ease, box-shadow 0.3s ease;
}

.slider::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 4px;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.3s ease;
}

.switch input:checked + .slider {
  background: #0f172a;
  box-shadow: 0 0 12px 2px #22d3ee;
}

.switch input:checked + .slider::before {
  transform: translateX(24px);
  box-shadow: 0 0 8px 2px #22d3ee;
}`,
      technologies: ['HTML', 'CSS', 'CSS Animation'],
    },
    {
      name: 'Simple Switch',
      slug: 'simple-switch',
      description: 'Toggle switch minimalista com track cinza que muda para verde ao ativar.',
      html: '<label class="simple-switch">\n  <input type="checkbox" />\n  <span class="track"></span>\n</label>',
      css: `.simple-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.simple-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.track {
  position: absolute;
  inset: 0;
  background: #d1d5db;
  border-radius: 999px;
  transition: background 0.2s ease;
}

.track::before {
  content: '';
  position: absolute;
  left: 3px;
  top: 3px;
  width: 18px;
  height: 18px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s ease;
}

.simple-switch input:checked + .track {
  background: #16a34a;
}

.simple-switch input:checked + .track::before {
  transform: translateX(20px);
}`,
      technologies: ['HTML', 'CSS'],
    },
  ],
  Cards: [
    {
      name: 'Profile Card',
      slug: 'profile-card',
      description: 'Cartão de perfil com avatar, nome e cargo, ideal para listagens de equipe.',
      html: '<div class="profile-card">\n  <img src="https://i.pravatar.cc/80" alt="Avatar" />\n  <h3>Jane Cooper</h3>\n  <p>Product Designer</p>\n</div>',
      css: `.profile-card {
  width: 220px;
  padding: 24px;
  text-align: center;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.profile-card img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  margin-bottom: 12px;
}

.profile-card h3 {
  margin: 0 0 4px;
  font-size: 1.05rem;
  color: #111827;
}

.profile-card p {
  margin: 0;
  font-size: 0.85rem;
  color: #6b7280;
}`,
      technologies: ['HTML', 'CSS'],
    },
    {
      name: 'Pricing Card',
      slug: 'pricing-card',
      description:
        'Cartão de preço com plano, valor mensal, lista de benefícios e botão de chamada para ação.',
      html: '<div class="pricing-card">\n  <h3>Pro Plan</h3>\n  <p class="price">$19<span>/mo</span></p>\n  <ul>\n    <li>Unlimited projects</li>\n    <li>Priority support</li>\n  </ul>\n  <button>Choose Plan</button>\n</div>',
      css: `.pricing-card {
  width: 240px;
  padding: 28px;
  border-radius: 16px;
  background: #0f172a;
  color: #f8fafc;
  text-align: center;
}

.pricing-card .price {
  font-size: 2rem;
  font-weight: 700;
  margin: 8px 0 16px;
}

.pricing-card .price span {
  font-size: 0.9rem;
  font-weight: 400;
  color: #94a3b8;
}

.pricing-card ul {
  list-style: none;
  padding: 0;
  margin: 0 0 20px;
  font-size: 0.85rem;
  color: #cbd5e1;
}

.pricing-card li {
  padding: 4px 0;
}

.pricing-card button {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: #6366f1;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}`,
      technologies: ['HTML', 'CSS'],
    },
  ],
  Loaders: [
    {
      name: 'Bouncing Dots Loader',
      slug: 'bouncing-dots-loader',
      description: 'Indicador de carregamento com três pontos que saltam em sequência.',
      html: '<div class="dots-loader">\n  <span></span>\n  <span></span>\n  <span></span>\n</div>',
      css: `.dots-loader {
  display: flex;
  gap: 6px;
}

.dots-loader span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #6366f1;
  animation: bounce 0.6s ease-in-out infinite;
}

.dots-loader span:nth-child(2) {
  animation-delay: 0.15s;
}

.dots-loader span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  40% {
    transform: translateY(-8px);
    opacity: 1;
  }
}`,
      technologies: ['HTML', 'CSS', 'CSS Animation'],
    },
    {
      name: 'Spinner Ring',
      slug: 'spinner-ring',
      description: 'Spinner circular clássico usado para indicar carregamento em andamento.',
      html: '<div class="spinner-ring"></div>',
      css: `.spinner-ring {
  width: 36px;
  height: 36px;
  border: 4px solid #e5e7eb;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}`,
      technologies: ['HTML', 'CSS', 'CSS Animation'],
    },
  ],
  Inputs: [
    {
      name: 'Floating Label Input',
      slug: 'floating-label-input',
      description: 'Campo de texto com label flutuante que sobe ao ganhar foco ou receber conteúdo.',
      html: '<div class="floating-input">\n  <input type="text" id="name" placeholder=" " />\n  <label for="name">Full name</label>\n</div>',
      css: `.floating-input {
  position: relative;
  width: 240px;
}

.floating-input input {
  width: 100%;
  padding: 14px 12px 6px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  box-sizing: border-box;
}

.floating-input label {
  position: absolute;
  left: 12px;
  top: 14px;
  color: #6b7280;
  font-size: 0.95rem;
  pointer-events: none;
  transition: all 0.15s ease;
}

.floating-input input:focus + label,
.floating-input input:not(:placeholder-shown) + label {
  top: 4px;
  font-size: 0.7rem;
  color: #4f46e5;
}`,
      technologies: ['HTML', 'CSS'],
    },
    {
      name: 'Search Input With Icon',
      slug: 'search-input-icon',
      description: 'Campo de busca com ícone de lupa embutido, pronto para filtrar listas de componentes.',
      html: '<div class="search-input">\n  <svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6" /><line x1="15" y1="15" x2="20" y2="20" /></svg>\n  <input type="text" placeholder="Search components..." />\n</div>',
      css: `.search-input {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 260px;
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  background: #fff;
}

.search-input svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: #9ca3af;
  stroke-width: 2;
}

.search-input input {
  border: none;
  outline: none;
  flex: 1;
  font-size: 0.9rem;
}`,
      technologies: ['HTML', 'CSS', 'SVG'],
    },
  ],
  'Radio Buttons': [
    {
      name: 'Custom Radio Group',
      slug: 'custom-radio-group',
      description: 'Grupo de radio buttons horizontal para alternar entre opções mutuamente exclusivas.',
      html: '<div class="radio-group">\n  <label><input type="radio" name="plan" checked /> Monthly</label>\n  <label><input type="radio" name="plan" /> Yearly</label>\n</div>',
      css: `.radio-group {
  display: flex;
  gap: 20px;
  font-size: 0.9rem;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.radio-group input {
  width: 16px;
  height: 16px;
  accent-color: #4f46e5;
}`,
      technologies: ['HTML', 'CSS'],
    },
    {
      name: 'Card Style Radio',
      slug: 'card-style-radio',
      description: 'Radio buttons apresentados como cartões selecionáveis, com destaque visual na opção marcada.',
      html: '<div class="card-radio-group">\n  <label class="card-radio">\n    <input type="radio" name="tier" checked />\n    <span>Basic</span>\n  </label>\n  <label class="card-radio">\n    <input type="radio" name="tier" />\n    <span>Premium</span>\n  </label>\n</div>',
      css: `.card-radio-group {
  display: flex;
  gap: 12px;
}

.card-radio {
  display: block;
  padding: 14px 20px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.card-radio input {
  display: none;
}

.card-radio:has(input:checked) {
  border-color: #4f46e5;
  background: #eef2ff;
}`,
      technologies: ['HTML', 'CSS'],
    },
  ],
  Forms: [
    {
      name: 'Simple Login Form',
      slug: 'simple-login-form',
      description: 'Formulário de login compacto com campos de email e senha, e botão de envio.',
      html: '<form class="login-form">\n  <label>Email\n    <input type="email" required />\n  </label>\n  <label>Password\n    <input type="password" required />\n  </label>\n  <button type="submit">Sign in</button>\n</form>',
      css: `.login-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 260px;
  padding: 24px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.login-form label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
  color: #374151;
}

.login-form input {
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
}

.login-form button {
  margin-top: 6px;
  padding: 10px;
  border: none;
  border-radius: 6px;
  background: #4f46e5;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}`,
      technologies: ['HTML', 'CSS'],
    },
    {
      name: 'Newsletter Signup Form',
      slug: 'newsletter-signup-form',
      description: 'Formulário de inscrição em newsletter com campo de email e botão inline.',
      html: '<form class="newsletter-form">\n  <input type="email" placeholder="you@example.com" required />\n  <button type="submit">Subscribe</button>\n</form>',
      css: `.newsletter-form {
  display: flex;
  max-width: 360px;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  overflow: hidden;
}

.newsletter-form input {
  flex: 1;
  padding: 12px 16px;
  border: none;
  outline: none;
  font-size: 0.9rem;
}

.newsletter-form button {
  padding: 12px 20px;
  border: none;
  background: #111827;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}`,
      technologies: ['HTML', 'CSS'],
    },
  ],
  Patterns: [
    {
      name: 'Diagonal Stripes Background',
      slug: 'diagonal-stripes-pattern',
      description: 'Fundo com listras diagonais repetidas, útil como textura decorativa em seções da página.',
      html: '<div class="stripes-pattern"></div>',
      css: `.stripes-pattern {
  width: 100%;
  height: 200px;
  background-image: repeating-linear-gradient(
    45deg,
    #eef2ff,
    #eef2ff 10px,
    #e0e7ff 10px,
    #e0e7ff 20px
  );
  border-radius: 12px;
}`,
      technologies: ['HTML', 'CSS'],
    },
    {
      name: 'Dot Grid Background',
      slug: 'dot-grid-pattern',
      description: 'Fundo com grade de pontos regularmente espaçados, comum em seções hero e dashboards.',
      html: '<div class="dot-grid-pattern"></div>',
      css: `.dot-grid-pattern {
  width: 100%;
  height: 200px;
  background-image: radial-gradient(#c7d2fe 1.5px, transparent 1.5px);
  background-size: 18px 18px;
  background-color: #f8fafc;
  border-radius: 12px;
}`,
      technologies: ['HTML', 'CSS'],
    },
  ],
  Tooltips: [
    {
      name: 'Simple Tooltip',
      slug: 'simple-tooltip',
      description: 'Tooltip simples que aparece acima do elemento ao passar o mouse.',
      html: '<span class="tooltip-wrapper">\n  Hover me\n  <span class="tooltip-text">I am a tooltip</span>\n</span>',
      css: `.tooltip-wrapper {
  position: relative;
  cursor: pointer;
  border-bottom: 1px dashed #9ca3af;
}

.tooltip-text {
  position: absolute;
  bottom: 130%;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 10px;
  border-radius: 6px;
  background: #111827;
  color: #fff;
  font-size: 0.75rem;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.tooltip-wrapper:hover .tooltip-text {
  opacity: 1;
}`,
      technologies: ['HTML', 'CSS'],
    },
    {
      name: 'Arrow Tooltip',
      slug: 'arrow-tooltip',
      description: 'Tooltip com seta apontando para o elemento de origem, reforçando a relação visual entre eles.',
      html: '<span class="arrow-tooltip">\n  Hover me\n  <span class="bubble">Helpful hint<i></i></span>\n</span>',
      css: `.arrow-tooltip {
  position: relative;
  cursor: pointer;
  border-bottom: 1px dashed #9ca3af;
}

.arrow-tooltip .bubble {
  position: absolute;
  bottom: 140%;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 10px;
  border-radius: 6px;
  background: #4f46e5;
  color: #fff;
  font-size: 0.75rem;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.arrow-tooltip .bubble i {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #4f46e5;
}

.arrow-tooltip:hover .bubble {
  opacity: 1;
}`,
      technologies: ['HTML', 'CSS'],
    },
  ],
  'UI Kits': [
    {
      name: 'Button Kit Basics',
      slug: 'button-kit-basics',
      description:
        'Conjunto básico de variações de botão (primário, secundário e ghost) para compor um design system.',
      html: '<div class="button-kit">\n  <button class="btn primary">Primary</button>\n  <button class="btn secondary">Secondary</button>\n  <button class="btn ghost">Ghost</button>\n</div>',
      css: `.button-kit {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
}

.btn.primary {
  background: #4f46e5;
  color: #fff;
}

.btn.secondary {
  background: #e0e7ff;
  color: #4338ca;
}

.btn.ghost {
  background: transparent;
  border-color: #d1d5db;
  color: #374151;
}`,
      technologies: ['HTML', 'CSS'],
    },
    {
      name: 'Color Palette Kit',
      slug: 'color-palette-kit',
      description: 'Amostra de paleta de cores em blocos, útil para documentar os tons de um design system.',
      html: '<div class="palette-kit">\n  <span style="background:#4f46e5"></span>\n  <span style="background:#22d3ee"></span>\n  <span style="background:#f472b6"></span>\n  <span style="background:#facc15"></span>\n  <span style="background:#111827"></span>\n</div>',
      css: `.palette-kit {
  display: flex;
  gap: 8px;
}

.palette-kit span {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
}`,
      technologies: ['HTML', 'CSS'],
    },
  ],
};

/** Upserta as 14 categorias e retorna um mapa de slug -> id para uso na etapa seguinte. */
async function seedCategories(): Promise<Map<string, string>> {
  const idsBySlug = new Map<string, string>();

  for (const [index, name] of CATEGORIES.entries()) {
    const slug = CATEGORY_SLUGS[name];
    const category = await prisma.category.upsert({
      where: { slug },
      update: { name, position: index },
      create: { name, slug, position: index },
    });
    idsBySlug.set(slug, category.id);
  }

  return idsBySlug;
}

/**
 * Upserta os componentes de exemplo, sempre `PUBLISHED` (precisam estar
 * disponíveis para a API pública sem cadastro manual). `publishedAt` só é
 * definido na criação — mesma regra do service (seção 7): a primeira
 * publicação não deve ser sobrescrita a cada nova execução do seed.
 */
async function seedComponents(categoryIdsBySlug: Map<string, string>): Promise<void> {
  for (const categoryName of CATEGORIES) {
    const categorySlug = CATEGORY_SLUGS[categoryName];
    const categoryId = categoryIdsBySlug.get(categorySlug);
    if (!categoryId) {
      throw new Error(`Categoria "${categoryName}" não foi criada antes dos componentes`);
    }

    for (const component of COMPONENTS_BY_CATEGORY[categoryName]) {
      await prisma.component.upsert({
        where: { slug: component.slug },
        update: {
          name: component.name,
          description: component.description,
          html: component.html,
          css: component.css,
          js: component.js ?? null,
          technologies: component.technologies,
          categoryId,
          status: ComponentStatus.PUBLISHED,
        },
        create: {
          name: component.name,
          slug: component.slug,
          description: component.description,
          html: component.html,
          css: component.css,
          js: component.js ?? null,
          technologies: component.technologies,
          categoryId,
          status: ComponentStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      });
    }
  }
}

async function main(): Promise<void> {
  const categoryIdsBySlug = await seedCategories();
  await seedComponents(categoryIdsBySlug);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
