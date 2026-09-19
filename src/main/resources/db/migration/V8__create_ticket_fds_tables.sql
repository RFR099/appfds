-- Ticket de pedido de FDS a um fornecedor (RF07 — botão "Novo Ticket").
-- fds_id é opcional: um ticket pode pedir uma FDS que ainda não existe no
-- catálogo (produto novo), daí não ter NOT NULL nem ON DELETE CASCADE.
CREATE TABLE ticket_fds (
    id             UUID PRIMARY KEY,
    fds_id         UUID REFERENCES fds (id),
    fornecedor_id  UUID NOT NULL REFERENCES fornecedor (id),
    estado         VARCHAR(20) NOT NULL,
    data_abertura  TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_ticket_fds_fornecedor ON ticket_fds (fornecedor_id);
CREATE INDEX idx_ticket_fds_fds ON ticket_fds (fds_id);
CREATE INDEX idx_ticket_fds_estado ON ticket_fds (estado);

-- Histórico de mensagens de um ticket — coleção @ElementCollection ordenada
-- por "posicao" (ver MensagemTicketEmbeddable), tal como fornecedor_contactos.
CREATE TABLE ticket_fds_mensagens (
    ticket_fds_id UUID NOT NULL REFERENCES ticket_fds (id) ON DELETE CASCADE,
    posicao       INTEGER NOT NULL,
    autor         VARCHAR(255) NOT NULL,
    texto         TEXT NOT NULL,
    data_envio    TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (ticket_fds_id, posicao)
);
