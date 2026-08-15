-- Habilita busca por similaridade (ILIKE acelerado por índice GIN) usada em
-- GET /api/components?q=... (MVP1, seção 5): suficiente até milhares de
-- registros, sem necessidade de tsvector, triggers ou serviço de busca externo.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX components_name_trgm_idx
  ON "components" USING GIN (name gin_trgm_ops);

CREATE INDEX components_description_trgm_idx
  ON "components" USING GIN (description gin_trgm_ops);
