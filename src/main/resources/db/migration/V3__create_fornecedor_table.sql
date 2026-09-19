CREATE TABLE fornecedor (
    id              UUID PRIMARY KEY,
    nome            VARCHAR(150) NOT NULL,
    email_principal VARCHAR(255) NOT NULL,
    criado_em       TIMESTAMP NOT NULL DEFAULT now()
);

-- lista ORDENADA de contactos (@OrderColumn no lado JPA) — a posição faz
-- parte da chave para preservar a ordem de inserção sem impedir contactos
-- repetidos (o domínio modela "contactos" como List, não Set).
CREATE TABLE fornecedor_contactos (
    fornecedor_id UUID NOT NULL REFERENCES fornecedor (id) ON DELETE CASCADE,
    posicao       INT NOT NULL,
    contacto      VARCHAR(255) NOT NULL,
    PRIMARY KEY (fornecedor_id, posicao)
);

CREATE INDEX idx_fornecedor_nome ON fornecedor (nome);

-- agora que o agregado Fornecedor existe, reforçamos a integridade
-- referencial da FDS para com ele.
ALTER TABLE fds
    ADD CONSTRAINT fk_fds_fornecedor FOREIGN KEY (fornecedor_id) REFERENCES fornecedor (id);
