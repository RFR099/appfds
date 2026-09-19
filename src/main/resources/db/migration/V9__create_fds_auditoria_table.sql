-- Histórico de auditoria de transições de estado de uma FDS (RF12, RNF03).
-- Alimentada exclusivamente pelo listener de Domain Events
-- (RegistarFDSAuditoriaListener), nunca por triggers de base de dados —
-- mantém o formato do registo controlado pelo domínio (ver
-- especificacao-tecnica.md, secção de Auditoria).
CREATE TABLE fds_auditoria (
    id              UUID PRIMARY KEY,
    fds_id          UUID NOT NULL REFERENCES fds (id) ON DELETE CASCADE,
    estado_anterior VARCHAR(30) NOT NULL,
    estado_novo     VARCHAR(30) NOT NULL,
    ocorrido_em     TIMESTAMPTZ NOT NULL,
    -- "Quem alterou" (RF12) ainda não é capturado em lado nenhum do sistema
    -- — exigiria propagar a identidade do JWT do Keycloak até ao Domain
    -- Event. Coluna já criada (nullable) para não exigir nova migração
    -- quando essa funcionalidade for construída.
    utilizador      VARCHAR(255)
);

CREATE INDEX idx_fds_auditoria_fds_id ON fds_auditoria (fds_id);
CREATE INDEX idx_fds_auditoria_ocorrido_em ON fds_auditoria (ocorrido_em);
