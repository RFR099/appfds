package com.dstgroup.fds.domain.shared;

import java.time.Instant;

/**
 * Marcador para eventos de domínio (ex.: {@code FDSCriadaEvent}, {@code FDSEstadoAlteradoEvent}).
 *
 * <p>Os eventos são objetos simples de dados (records), sem dependências de
 * infraestrutura de mensageria — a publicação/entrega é responsabilidade da
 * camada de application/infrastructure.</p>
 */
public interface DomainEvent {

	Instant ocorridoEm();
}
