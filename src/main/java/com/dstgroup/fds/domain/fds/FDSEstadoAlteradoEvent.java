package com.dstgroup.fds.domain.fds;

import java.time.Instant;

import com.dstgroup.fds.domain.shared.DomainEvent;

/**
 * Emitido sempre que uma {@link FichaDadosSeguranca} transita com sucesso de
 * um estado para outro (ver {@link FichaDadosSeguranca#atualizarPara}).
 *
 * <p>Nunca é emitido se a transição falhar — nem por violação da máquina de
 * estados ({@link TransicaoEstadoInvalidaException}), nem por campos
 * obrigatórios em falta ao sair de {@code RASCUNHO}
 * ({@link FichaDadosSegurancaIncompletaException}).</p>
 *
 * <p>Consumido, entre outros, pelo subdomínio de suporte de Alertas/Auditoria
 * (Fase 4) para alimentar a tabela {@code fds_auditoria}.</p>
 *
 * @param utilizador quem desencadeou a transição (RF12/RNF03, Fase 5 Parte 2)
 * — {@code null} quando não há nenhum utilizador humano associado à
 * execução (ex.: o job agendado de obsolescência).
 */
public record FDSEstadoAlteradoEvent(
		FDSId fdsId,
		EstadoFDS estadoAnterior,
		EstadoFDS estadoNovo,
		Instant ocorridoEm,
		String utilizador
) implements DomainEvent {
}
