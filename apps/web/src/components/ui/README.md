# ui/

Reservado para o subset do shadcn/ui definido no MVP2 (seção 3): `button`,
`input`, `dialog`, `tabs`, `select`, `toast`.

Nenhuma dependência do Radix/shadcn é instalada nesta etapa. Cada componente
será copiado para cá com `npx shadcn add <componente>` somente quando a tela
que o consome for implementada — o subset não é instalado de uma vez para
não trazer código morto ao repositório.
