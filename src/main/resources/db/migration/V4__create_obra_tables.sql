CREATE TABLE centro_produtivo (
    id          UUID PRIMARY KEY,
    nome        VARCHAR(255) NOT NULL,
    localizacao VARCHAR(255),
    criado_em   TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE obra (
    id                   UUID PRIMARY KEY,
    nome                 VARCHAR(255) NOT NULL,
    centro_produtivo_id  UUID NOT NULL REFERENCES centro_produtivo (id),
    criado_em            TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_centro_produtivo_nome ON centro_produtivo (nome);
CREATE INDEX idx_obra_nome ON obra (nome);
CREATE INDEX idx_obra_centro_produtivo ON obra (centro_produtivo_id);
