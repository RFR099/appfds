-- Índice simples para o filtro por Estado (igualdade exata, dropdown do protótipo).
CREATE INDEX idx_fds_estado ON fds (estado);

-- 'Nome' e 'Marca' são pesquisados por substring no protótipo (campo de
-- texto com lupa), não por prefixo — um índice btree comum não ajuda nesse
-- caso. pg_trgm + índice GIN permite que "LIKE '%...%'" use índice.
--
-- Os índices são FUNCIONAIS sobre lower(coluna), porque é exatamente essa a
-- expressão que a FDSSpecifications gera (cb.lower(...) -> SQL lower(...)) —
-- um índice trigram sobre a coluna "crua" não seria usado por essa query.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_fds_nome_lower_trgm ON fds USING gin (lower(nome_produto_quimico) gin_trgm_ops);
CREATE INDEX idx_fds_marca_lower_trgm ON fds USING gin (lower(marca) gin_trgm_ops);
