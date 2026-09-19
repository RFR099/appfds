package com.dstgroup.fds.domain.auditoria;

import java.time.Instant;
import java.util.Objects;

import com.dstgroup.fds.domain.fds.EstadoFDS;
import com.dstgroup.fds.domain.fds.FDSId;

/**
 * Um registo imutável de auditoria: "esta FDS transitou de X para Y, nesta
 * data/hora" (RF12, RNF03).
 *
 * <p>Não é um agregado — não tem invariantes de negócio próprias além de
 * "todos os campos são obrigatórios" nem comportamento que mude o seu
 * estado (é escrito uma vez e nunca alterado). É a projeção, em vocabulário
 * de domínio, do {@code FDSEstadoAlteradoEvent} que lhe dá origem — quem o
 * cria é sempre o listener de eventos (Fase 4, Parte 5), nunca um caso de
 * uso a "decidir" uma transição.</p>
 *
 * <p>O campo {@code utilizador} (RF12/RNF03, Fase 5 Parte 2) identifica quem
 * desencadeou a transição — extraído do JWT do Keycloak via
 * {@code AutenticacaoPort} e propagado através do
 * {@code FDSEstadoAlteradoEvent}. É legitimamente {@code null} quando a
 * transição é despoletada por um processo automático sem utilizador humano
 * por trás (ex.: {@code MarcarFDSObsoletasUseCase}, o job agendado) — por
 * isso não tem {@code requireNonNull}, ao contrário dos restantes campos.</p>
 */
public record RegistoAuditoriaFDS(
		FDSId fdsId, EstadoFDS estadoAnterior, EstadoFDS estadoNovo, Instant ocorridoEm, String utilizador) {

	public RegistoAuditoriaFDS {
		Objects.requireNonNull(fdsId, "O id da FDS é obrigatório num registo de auditoria.");
		Objects.requireNonNull(estadoAnterior, "O estado anterior é obrigatório num registo de auditoria.");
		Objects.requireNonNull(estadoNovo, "O estado novo é obrigatório num registo de auditoria.");
		Objects.requireNonNull(ocorridoEm, "A data/hora de ocorrência é obrigatória num registo de auditoria.");
		// utilizador é legitimamente nullable — ver javadoc da classe.
	}
}
