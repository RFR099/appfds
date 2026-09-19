CREATE TABLE fds (
    id                    UUID PRIMARY KEY,
    nome_produto_quimico  VARCHAR(255) NOT NULL,
    marca                 VARCHAR(100) NOT NULL,
    fornecedor_id         UUID,
    email_contacto        VARCHAR(255),
    estado                VARCHAR(30)  NOT NULL,
    data_revisao          DATE,
    data_validade         DATE,
    criado_em             TIMESTAMP NOT NULL DEFAULT now(),
    atualizado_em         TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE fds_pictogramas (
    fds_id     UUID NOT NULL REFERENCES fds (id) ON DELETE CASCADE,
    pictograma VARCHAR(60) NOT NULL,
    PRIMARY KEY (fds_id, pictograma)
);

-- suporta a verificação de duplicados (RF15) e a futura pesquisa por nome/marca/fornecedor (Fase 2)
CREATE INDEX idx_fds_nome_marca_fornecedor ON fds (nome_produto_quimico, marca, fornecedor_id);
