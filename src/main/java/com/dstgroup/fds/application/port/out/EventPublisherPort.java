package com.dstgroup.fds.application.port.out;

import java.util.List;

import com.dstgroup.fds.domain.shared.DomainEvent;

/**
 * Port de saída (Onion): publica os Domain Events que um agregado acumulou
 * (via {@code pullDomainEvents()}) para quem os quiser consumir — hoje
 * ninguém consome ainda; a partir da Fase 4, Parte 5 (Auditoria), um
 * listener vai reagir a {@code FDSEstadoAlteradoEvent} e escrever em
 * {@code fds_auditoria}.
 *
 * <p>Deliberadamente genérico (recebe {@code List<DomainEvent>}, não um
 * evento concreto) para que qualquer caso de uso que persista qualquer
 * agregado o possa usar sem acoplar a Application a um tipo de evento
 * específico. Um caso de uso chama isto sempre a seguir a
 * {@code repositorio.guardar(agregado)}, com
 * {@code agregado.pullDomainEvents(Instant.now(relogio), autenticacao.utilizadorAtual().orElse(null))}
 * — nunca antes, para não publicar eventos de um estado que ainda não foi
 * persistido com sucesso, e sempre com o {@code Clock} e o
 * {@code AutenticacaoPort} injetados do próprio caso de uso (Fase 5, Parte
 * 2), nunca {@code Instant.now()} direto nem acesso direto ao
 * {@code SecurityContext}.</p>
 */
public interface EventPublisherPort {

	void publicar(List<DomainEvent> eventos);
}
