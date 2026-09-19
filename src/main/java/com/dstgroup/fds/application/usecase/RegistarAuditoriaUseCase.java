package com.dstgroup.fds.application.usecase;

import java.time.Instant;

import com.dstgroup.fds.application.port.out.AuditoriaRepositoryPort;
import com.dstgroup.fds.domain.auditoria.RegistoAuditoriaFDS;
import com.dstgroup.fds.domain.fds.EstadoFDS;
import com.dstgroup.fds.domain.fds.FDSId;

/**
 * Caso de uso: regista uma entrada de auditoria a partir dos dados de uma
 * transição de estado de FDS já ocorrida (RF12).
 *
 * <p>Recebe os campos já desembrulhados, não o {@code FDSEstadoAlteradoEvent}
 * em si — invocado pelo listener de infraestrutura (Fase 4, Parte 5) que
 * reage a esse evento, mas a Application nunca depende do mecanismo de
 * entrega de eventos (Spring {@code @EventListener}) nem do pacote
 * {@code domain.fds} além do necessário para o tipo {@link EstadoFDS}.</p>
 */
public class RegistarAuditoriaUseCase {

	private final AuditoriaRepositoryPort repositorio;

	public RegistarAuditoriaUseCase(AuditoriaRepositoryPort repositorio) {
		this.repositorio = repositorio;
	}

	public void executar(FDSId fdsId, EstadoFDS estadoAnterior, EstadoFDS estadoNovo, Instant ocorridoEm,
			String utilizador) {
		repositorio.registar(new RegistoAuditoriaFDS(fdsId, estadoAnterior, estadoNovo, ocorridoEm, utilizador));
	}
}
