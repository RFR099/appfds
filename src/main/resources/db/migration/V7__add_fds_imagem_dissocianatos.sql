ALTER TABLE fds
    ADD COLUMN imagem_caminho       VARCHAR(500),
    ADD COLUMN imagem_tipo_mime     VARCHAR(50),
    ADD COLUMN imagem_tamanho_bytes BIGINT,
    ADD COLUMN tem_dissocianatos    BOOLEAN NOT NULL DEFAULT false;
