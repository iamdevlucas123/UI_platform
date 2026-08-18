import type { NextConfig } from 'next';

/**
 * `output: 'standalone'` — o Dockerfile de produção (etapa Final, seção 12
 * do MVP2) copia apenas `.next/standalone`, sem precisar do `node_modules`
 * completo do monorepo na imagem final.
 */
const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
