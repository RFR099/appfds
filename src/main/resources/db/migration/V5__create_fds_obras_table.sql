-- Associação FDS <-> Obra (RF11): uma FDS pode estar associada a várias
-- obras onde o produto é usado. Não referencia diretamente centro_produtivo
-- — essa relação é derivada via obra.centro_produtivo_id (evita duplicar a
-- associação em dois sítios).
CREATE TABLE fds_obras (
    fds_id  UUID NOT NULL REFERENCES fds (id) ON DELETE CASCADE,
    obra_id UUID NOT NULL REFERENCES obra (id),
    PRIMARY KEY (fds_id, obra_id)
);

CREATE INDEX idx_fds_obras_obra ON fds_obras (obra_id);
