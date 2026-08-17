# Prompts de implementação — MVP2

Use os prompts abaixo em ordem. Cada um é uma unidade de trabalho que pode ser
entregue, revisada e validada antes do próximo. Eles partem de `docs/MVP2.md`,
que é a fonte de verdade: em caso de divergência, siga aquele documento.

## Briefing comum

Inclua este briefing no início de toda conversa de implementação (ou mantenha-o
como contexto do agente):

> Você está implementando a etapa MVP2 deste monorepo pnpm. Leia integralmente
> `docs/MVP2.md` antes de editar. Inspecione o estado atual do repositório e
> reaproveite schemas Zod e tipos de `@uilib/shared`; não duplique contratos.
> Preserve mudanças não relacionadas que já estejam no worktree. Use TypeScript
> estrito, App Router do Next.js 15 e Tailwind CSS v4. Não invente endpoints nem
> altere o envelope REST definido no documento. Faça mudanças pequenas e
> coesas, execute os testes/lint/typecheck relevantes e reporte arquivos
> alterados, validações executadas e pendências reais. Não use
> `dangerouslySetInnerHTML` para renderizar código de componentes.

## 01 — Diagnóstico e fundação do app web

> Aplique o briefing comum. Primeiro, faça uma leitura do repositório e compare
> o estado atual com as seções 3, 7, 10 e 13 de `docs/MVP2.md`. Em seguida,
> crie ou complete `apps/web` como um app Next.js 15 com App Router, TypeScript
> estrito e Tailwind CSS v4, integrado corretamente ao workspace pnpm como
> `@uilib/web`.
>
> Instale somente as dependências necessárias nesta fase: `@clerk/nextjs`,
> `@tanstack/react-query`, React Hook Form, Zod resolver, Shiki e
> `lucide-react`; prepare a estrutura para o subset shadcn/ui (`button`,
> `input`, `dialog`, `tabs`, `select` e toast) sem incluir uma biblioteca de UI
> pesada. Configure aliases, lint, typecheck, scripts de dev/build/test e
> `next.config.ts` com `output: 'standalone'`. Crie o layout raiz e uma página
> temporária mínima que permita validar o boot da aplicação, sem antecipar as
> telas do catálogo.
>
> Implemente `src/lib/env.ts` com Zod para validar no servidor e no cliente as
> variáveis da seção 13: URLs públicas/internas da API, URL do site, chaves
> públicas do Clerk e segredos apenas no servidor. Nunca exponha
> `CLERK_SECRET_KEY` ou `REVALIDATE_SECRET` ao bundle. Atualize exemplos de
> ambiente e a documentação de execução apenas quando isso refletir o estado
> real. Não altere o `.gitignore` que já contém mudanças do usuário. Finalize
> validando que o workspace web compila e que os comandos raiz continuam
> funcionando.

## 02 — Cliente HTTP tipado e contratos de UI

> Aplique o briefing comum. Implemente a camada única de comunicação do web com
> a API em `apps/web/src/lib/api-client.ts` e os tipos auxiliares estritamente
> necessários. Antes, confira os schemas e exports existentes em
> `packages/shared` e os handlers da API; ajuste exports compartilhados apenas
> se forem realmente ausentes e sem duplicar schemas.
>
> Modele o envelope de sucesso paginado, sucesso de item e erro da seção 4.
> Centralize a construção de query strings, parsing/validação de respostas e
> uma classe/estrutura de erro que preserve `status`, `code`, `message` e
> `details` retornados pela API. Separe clientes/rotas usados no servidor dos
> usados no browser: Server Components devem usar `INTERNAL_API_URL`; chamadas
> administrativas no browser devem usar `NEXT_PUBLIC_API_URL` e aceitar o
> token Clerk fornecido pelo chamador. Não faça chamadas autenticadas com
> segredo do servidor no navegador.
>
> Cubra `health`, categorias, listagem e detalhe públicos, novo prompt por
> stack e todos os CRUDs administrativos de componentes/categorias. Trate 404,
> 401, 403, 409 e 422 de forma uniforme para a UI poder mostrar mensagens sem
> perder dados de formulário. Adicione testes unitários para serialização de
> queries e parsing de envelopes/erros, incluindo casos inválidos. Não construa
> páginas nesta tarefa.

## 03 — Preview isolado em iframe (protótipo obrigatório)

> Aplique o briefing comum. Prototipe e entregue primeiro a infraestrutura de
> preview da seção 8, isolada das páginas de catálogo. Crie
> `build-srcdoc.ts`, `SandboxPreview`, `LazyPreview` e o controle de tema de
> fundo em `apps/web/src/components/preview`.
>
> `build-srcdoc` deve montar um documento HTML mínimo a partir de HTML, CSS e
> JS do componente: `meta charset`, reset curto, `<style>`, markup e script
> opcional. Inclua uma CSP no documento que bloqueie conexões de rede e envio
> de formulários (`connect-src 'none'` e `form-action 'none'`, além das demais
> diretivas coerentes). Preserve a capacidade de scripts locais do componente
> funcionar dentro do preview. Não sanitize nem injete o código no DOM React.
>
> Renderize exclusivamente em `<iframe sandbox="allow-scripts">`, sem
> `allow-same-origin`, e não adicione permissões extras. O componente precisa
> permitir tamanho/classe e alternar a área externa entre fundo claro e escuro.
> `LazyPreview` só deve atribuir `srcdoc` quando estiver próximo/visível no
> viewport usando `IntersectionObserver`, exibindo skeleton até então e
> funcionando com fallback seguro quando a API não estiver disponível.
>
> Crie uma rota ou story de desenvolvimento não indexável para validar um
> exemplo com HTML, CSS e JavaScript, além de testes de `build-srcdoc` e da
> configuração segura do iframe. Verifique visualmente a rota em viewport
> desktop e mobile antes de seguir para o catálogo.

## 04 — Catálogo público: home, busca, filtros e paginação

> Aplique o briefing comum. Implemente a biblioteca pública descrita na seção
> 5.1 usando a infraestrutura de preview já entregue. Crie os componentes de
> catálogo (`ComponentCard`, `Grid`, `SearchBar`, `CategoryNav`) e a rota `/`.
> Cada card deve ter preview ao vivo preguiçoso, nome, categoria e um link
> acessível para `/component/[slug]`.
>
> A listagem padrão deve ser ISR com `revalidate: 300`, tag `components`, 24
> itens por página e ordenação por mais recentes. Ofereça ordenação alfabética,
> filtro por categoria e paginação, refletindo integralmente o estado na URL.
> A busca por nome/descrição precisa de debounce de 300 ms, atualizar `?q=` e
> refazer a consulta sem criar um histórico por tecla digitada. Use uma rota
> dinâmica apropriada quando houver busca para não tentar pré-renderizar
> combinações infinitas. Faça URLs canônicas e preserve os demais parâmetros ao
> atualizar apenas um filtro.
>
> Entregue skeleton de carga, vazio explicativo, erro recuperável e banner
> discreto quando um refetch client-side falhar — conteúdo ISR já em cache não
> deve sumir por uma indisponibilidade transitória. Garanta responsividade e
> navegação por teclado. Escreva testes para SearchBar (debounce e URL) e para
> os estados principais do grid. Não implemente ainda a página de detalhe.

## 05 — Página de categoria com ISR

> Aplique o briefing comum. Implemente `/category/[slug]` a partir do mesmo
> catálogo público, sem duplicar a lógica de card, grid, filtros ou paginação.
> A página deve filtrar pelo slug, manter ordenação/paginação por query string,
> usar ISR e gerar previamente os slugs conhecidos por
> `generateStaticParams`. Use a tag de cache `components` nas consultas que
> dependem do catálogo.
>
> Exiba o nome da categoria e uma navegação clara de volta à biblioteca; trate
> categoria/componente inexistente com `notFound()` e falhas inesperadas com um
> estado de erro apropriado. Preserve SEO básico (título e descrição
> específicos) e assegure que os links de categoria da home e dos cards chegam
> a esta rota. Valide ao menos a geração de params, URL de filtro e o caso 404.

## 06 — Detalhe do componente, código e cópia

> Aplique o briefing comum. Implemente `/component/[slug]` conforme a seção
> 5.2. A página deve buscar o componente pelo slug usando a API interna, ter
> ISR com `revalidate: 300`, tag `components`, `generateStaticParams` e
> `notFound()` para 404. Mostre nome, link de categoria, descrição tratada como
> texto puro, tecnologias e preview amplo com alternância clara/escura usando
> o iframe sandbox já criado.
>
> Suporte também à revisão administrativa prevista no fluxo 3:
> `/component/[slug]?preview=1`. Só envie esse parâmetro e o token Bearer do
> Clerk à API quando a sessão tiver papel `admin`; uma pessoa anônima ou sem
> papel nunca pode visualizar um DRAFT por manipular a URL. Preserve a regra
> da API de que `preview=1` sem token de admin equivale a uma consulta pública.
> Para DRAFT em revisão, mantenha claro que se trata de prévia e não o inclua
> em metadata, sitemap ou links públicos; não invente um endpoint de prompt
> para drafts.
>
> Crie `CodeTabs` com abas HTML/CSS/JS: a aba JS só pode existir se o conteúdo
> for não vazio. Faça o highlight com Shiki no servidor, evitando incluir um
> highlighter em JavaScript no cliente. Exiba o resultado de forma acessível,
> sem `dangerouslySetInnerHTML`; se for necessário produzir markup colorido,
> use uma abordagem server-side segura que não transforme código de catálogo em
> HTML executável no documento principal.
>
> Crie `copy-to-clipboard.ts` e `CopyCodeButton`. O botão deve copiar HTML,
> CSS e JS em um formato previsível, com separadores claros apenas para trechos
> presentes; use `navigator.clipboard.writeText`, trate rejeição/indisponibilidade
> e apresente toast de sucesso ou erro. Adicione testes para a ausência da aba
> JS e para cópia bem-sucedida/falha. Não há integração com LLM nesta tarefa.

## 07 — Prompt para IA e seletor de stack

> Aplique o briefing comum. Complete a página de detalhe com `CopyPromptButton`
> e `StackSelector`, conforme as seções 4 e 5.3. O prompt inicial é o campo
> `prompt` retornado por `GET /api/components/:slug`; clicar em **Copy AI
> Prompt** deve somente copiá-lo para a área de transferência e mostrar toast.
> Não inclua SDK, chave, chamada HTTP ou qualquer integração com provedor de
> LLM.
>
> O seletor opcional deve permitir escolher framework e estilização e fazer
> `GET /api/components/:slug/prompt?framework=&styling=` ao alterar a stack.
> Desabilite cópia durante a atualização, preserve o último prompt válido caso
> a requisição falhe e apresente uma mensagem de erro recuperável. Evite
> condições de corrida: uma resposta antiga não pode substituir a escolha mais
> recente. Não faça a página inteira perder o cache ISR para isso; essa parte é
> interativa no cliente.
>
> Escreva testes de `CopyPromptButton` cobrindo clipboard e toast e do seletor
> cobrindo carregamento, erro e descarte de resposta obsoleta. Confirme que o
> texto copiado é idêntico ao retorno da API, sem interpolação no frontend.

## 08 — SEO técnico e descoberta

> Aplique o briefing comum. Implemente os requisitos de SEO da seção 5.2 e as
> rotas de descoberta da estrutura da seção 7. Crie metadata dinâmica com
> `<title>`, descrição e Open Graph na home, categoria e detalhe de componente.
> Gere as imagens Open Graph dinamicamente com `ImageResponse`, sem upload ou
> dependência de imagem externa; a imagem do detalhe deve incorporar somente
> informações públicas seguras do componente.
>
> Inclua JSON-LD válido e adequado a cada detalhe de componente, usando dados
> estruturados serializados com segurança. Implemente `sitemap.ts` com as URLs
> públicas reais (home, categorias e componentes publicados) e `robots.ts`
> liberando apenas a área pública, com `/admin` e `/sign-in` fora do índice.
> A área administrativa também deverá emitir `noindex` quando existir.
>
> Nunca permita que drafts entrem em sitemap, metadata pública ou geração de
> params. Valide tipos, resposta das rotas especiais e o JSON-LD gerado; faça
> uma inspeção manual das tags em pelo menos uma página de detalhe.

## 09 — Clerk: autenticação e autorização ponta a ponta

> Aplique o briefing comum. Substitua a autenticação provisória pela integração
> real do Clerk descrita na seção 9, preservando a interface de autenticação
> que controllers/services da API já consomem. Comece inspecionando o middleware
> administrativo existente, schemas de ambiente, CORS e os testes de integração
> da API.
>
> No frontend, envolva a aplicação com o provider do Clerk, implemente
> `/sign-in/[[...sign-in]]/page.tsx` e `middleware.ts` com `clerkMiddleware` e
> matcher para `/admin/*`. No layout de `/admin`, faça a autorização por
> `sessionClaims.metadata.role === 'admin'`; usuário autenticado sem esse papel
> deve receber `notFound()` (não um dashboard parcialmente acessível). Faça a
> área administrativa ser dinâmica e `noindex`.
>
> Na API, implemente `requireAdmin` com `verifyToken` de `@clerk/backend`,
> `CLERK_SECRET_KEY`, `authorizedParties: [WEB_ORIGIN]` e header Bearer. Sem
> token ou token inválido deve retornar 401; token válido sem
> `claims.metadata.role === 'admin'`, 403. Em sucesso, preencha
> `req.auth.userId` e `req.auth.email` como antes. Logo depois, implemente ou
> atualize `ensureLocalUser` com `prisma.user.upsert` pelo `clerkId`, de modo
> preguiçoso e sem webhook. Remova o uso efetivo de `DEV_ADMIN_TOKEN` e sua
> documentação quando não houver mais consumidor.
>
> Adicione testes de integração para 401 sem Bearer, 403 sem papel e sucesso
> com claims de admin, mockando a verificação de token sem depender da rede.
> Não crie fluxo de auto-signup nem qualquer mecanismo que permita ao usuário
> se atribuir o papel de admin.

## 10 — Base administrativa, dashboard e listagem de componentes

> Aplique o briefing comum. Construa a base de `/admin` já protegida pelo Clerk:
> provider de TanStack Query limitado à área administrativa, layout de
> navegação, toast e dashboard simples. A página inicial deve mostrar contagem
> de componentes por status e por categoria usando dados administrativos reais;
> se a API não expuser um agregado, calcule a partir de uma listagem completa
> de modo explícito e sem inventar endpoint.
>
> Implemente `/admin/components` com busca, filtro por status, carregamento,
> vazio, erro e link para criar/editar. A listagem precisa incluir DRAFTs,
> solicitar token do Clerk no momento da chamada e lidar com 401/403 limpando o
> estado de dados e direcionando o usuário ao caminho apropriado, sem expor
> detalhes do token. Use a camada `api-client.ts`; não espalhe `fetch` pelas
> telas.
>
> Use componentes acessíveis e responsivos do subset shadcn definido no MVP2.
> Adicione testes para o dashboard (dados/estados) e para os filtros da tabela.
> Não comece o formulário de edição nesta tarefa.

## 11 — Formulário e CRUD de componentes administrativos

> Aplique o briefing comum. Implemente as telas `/admin/components/new` e
> `/admin/components/[id]/edit` e o `ComponentForm`, usando React Hook Form,
> Zod resolver e os schemas compartilhados. O formulário deve ter `name`,
> `slug` (gerado automaticamente a partir do nome até que o usuário o edite),
> `description`, `category`, `technologies`, `html`, `css`, `js`,
> `promptTemplate` opcional e `status`. Carregue categorias reais e, na edição,
> o componente por ID via API administrativa.
>
> Inclua preview vivo no próprio formulário, baseado no mesmo iframe sandbox,
> com debounce enquanto HTML/CSS/JS é digitado. O preview nunca pode executar
> código no contexto do admin. Submissões devem usar TanStack Query, Bearer do
> Clerk e invalidar as consultas administrativas relevantes. Em 409 de slug,
> associe a mensagem de `details` ao campo correto sem apagar o formulário; em
> 422 de categoria, mostre erro igualmente acionável.
>
> Implemente exclusão com diálogo de confirmação, mutation DELETE, feedback
> por toast e retorno à listagem apenas após sucesso. Ao criar/editar/excluir,
> trate a invalidação/revalidação pública conforme a infraestrutura entregue no
> prompt 13. Depois de salvar um DRAFT, forneça o link de revisão
> `/component/[slug]?preview=1` e mantenha a publicação pública condicionada a
> `status=PUBLISHED`. Cubra slug automático/manual, mapeamento de erros,
> preview com debounce e mutações bem-sucedidas/falhas em testes de componente.

## 12 — CRUD administrativo de categorias

> Aplique o briefing comum. Implemente `/admin/categories` e `CategoryForm`.
> Permita listar, criar, editar e excluir categorias com `name`, `slug`,
> `description` e `position`; aplique o mesmo comportamento de geração de slug
> que o formulário de componentes, validação Zod, Bearer Clerk, TanStack Query
> e mensagens de mutation.
>
> A exclusão deve ser precedida de confirmação. Quando a API retornar 409 por
> existirem componentes associados, mantenha a categoria e exiba exatamente a
> mensagem útil retornada pelo backend, explicando o bloqueio sem sugerir que a
> operação foi concluída. Não simule cascata nem force exclusão.
>
> Invalide categorias na área admin e as consultas públicas afetadas após
> mutações. Teste criação/edição, exclusão bem-sucedida, 409 bloqueado e
> preservação dos campos diante de erro. Mantenha a tela simples: não há
> workflow de aprovação, histórico ou editor visual.

## 13 — Revalidação, Docker e segurança de produção local

> Aplique o briefing comum. Entregue a integração operacional das seções 7,
> 10, 11, 12 e 13. Crie `apps/web/src/app/api/revalidate/route.ts`, protegido
> por `REVALIDATE_SECRET`, para receber a notificação da API e executar
> `revalidateTag('components')`. Defina método, header/autenticação, respostas
> e erros de forma explícita e faça a API notificar esse endpoint somente após
> mutações administrativas concluídas com sucesso. Proteja contra segredo
> ausente, inválido e tentativas não autorizadas; não exponha o segredo ao
> cliente. Confirme que home, categorias, detalhes, sitemap e metadata
> dependentes são atualizados conforme necessário.
>
> Revise a CSP do site e implemente os controles da seção 11: `default-src
> 'self'`, `frame-src 'self' data:`, `img-src 'self' data: https:`, e apenas os
> domínios exigidos pelo Clerk em `script-src`/`connect-src`. Mantenha a CSP do
> `srcdoc` mais restrita e não enfraqueça o sandbox. Garanta que CORS da API
> aceite exclusivamente `WEB_ORIGIN`.
>
> Adicione o serviço `web` ao `docker-compose.yml` conforme a seção 12 e crie
> `apps/web/Dockerfile` com os stages `base`, `deps` e `dev`, Node 22 Alpine,
> Corepack e `libc6-compat`. Preserve serviços existentes e use
> `NEXT_PUBLIC_API_URL=http://localhost:4000` no browser e
> `INTERNAL_API_URL=http://api:4000` no SSR. Valide o YAML, o build do web e,
> se o ambiente permitir, `docker compose config` e uma inicialização local.

## 14 — Testes E2E e aceite final do MVP2

> Aplique o briefing comum. Faça uma revisão final contra todas as caixas da
> seção 15 de `docs/MVP2.md` e implemente o que faltar na pirâmide de testes.
> Configure Vitest + Testing Library no web (se ainda não configurados) e
> Playwright para o monorepo, com fixtures/dublês seguros para Clerk e API onde
> o ambiente não tiver credenciais reais. Não coloque chaves reais em testes ou
> no repositório.
>
> Os cenários E2E obrigatórios são: (1) home carrega e mostra cards; (2) busca
> filtra resultados; (3) detalhe renderiza preview e copia código; (4) copia
> prompt; (5) login administrativo, criação de componente e aparecimento na
> área pública após revalidação. Para clipboard, use a permissão/fixture do
> navegador apropriada e verifique o conteúdo, não apenas o clique. Para
> previews, verifique a presença e atributos de sandbox do iframe.
>
> Execute lint, typecheck, build, testes unitários/integração e E2E na maior
> extensão permitida pelo ambiente. Corrija apenas falhas causadas pelo escopo
> do MVP2, sem mascarar testes. Por fim, atualize o README com instruções reais
> de ambiente, Clerk, Docker e comandos de teste, removendo descrições antigas
> de MVP1. Entregue uma checklist do DoD com evidência objetiva para cada item
> e quaisquer limitações que dependam de credenciais externas.

## Ordem de aceite

1. Execute os prompts 01 a 03 e valide o preview isoladamente.
2. Execute 04 a 08 para concluir toda a experiência pública e SEO.
3. Execute 09 antes de iniciar 10 a 12, pois as rotas administrativas dependem
   da autenticação real.
4. Execute 13 antes dos testes de aceite, para que a publicação e o ambiente
   Docker sejam verificáveis.
5. Execute 14 somente depois de todas as funcionalidades anteriores estarem
   integradas.
