package com.dstgroup.fds.domain.fds;

import java.time.Instant;

import com.dstgroup.fds.domain.shared.DomainEvent;

/**
 * Emitido quando uma nova {@link FichaDadosSeguranca} é criada — sempre em
 * estado {@link EstadoFDS#RASCUNHO}.
 */
public record FDSCriadaEvent(FDSId fdsId, Instant ocorridoEm) implements DomainEvent {
}
