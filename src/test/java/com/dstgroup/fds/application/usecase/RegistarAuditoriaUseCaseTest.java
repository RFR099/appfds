package com.dstgroup.fds.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.dstgroup.fds.application.port.out.AuditoriaRepositoryPort;
import com.dstgroup.fds.domain.auditoria.RegistoAuditoriaFDS;
import com.dstgroup.fds.domain.fds.EstadoFDS;
import com.dstgroup.fds.domain.fds.FDSId;

/**
 * Este caso de uso é o único ponto que sabe traduzir "dados soltos de um
 * evento" (fdsId/estadoAnterior/estadoNovo/ocorridoEm) num
 * {@link RegistoAuditoriaFDS} de domínio e persisti-lo — recebe os campos
 * já desembrulhados (não o {@code FDSEstadoAlteradoEvent} em si) para que a
 * Application não dependa do tipo concreto do evento de um bounded context
 * específico nem do mecanismo de entrega (Spring {@code @EventListener}).
 */
class RegistarAuditoriaUseCaseTest {

	@Test
	void deveConstruirERegistarORegistoDeAuditoria() {
		AuditoriaRepositoryPortFalso repositorio = new AuditoriaRepositoryPortFalso();
		RegistarAuditoriaUseCase useCase = new RegistarAuditoriaUseCase(repositorio);
		FDSId fdsId = FDSId.gerar();
		Instant ocorridoEm = Instant.parse("2026-06-01T10:00:00Z");

		useCase.executar(fdsId, EstadoFDS.ATUALIZADA, EstadoFDS.OBSOLETA, ocorridoEm, "gestor.dev");

		assertThat(repositorio.registados).hasSize(1);
		RegistoAuditoriaFDS registo = repositorio.registados.get(0);
		assertThat(registo.fdsId()).isEqualTo(fdsId);
		assertThat(registo.estadoAnterior()).isEqualTo(EstadoFDS.ATUALIZADA);
		assertThat(registo.estadoNovo()).isEqualTo(EstadoFDS.OBSOLETA);
		assertThat(registo.ocorridoEm()).isEqualTo(ocorridoEm);
		assertThat(registo.utilizador()).isEqualTo("gestor.dev");
	}

	@Test
	void devePermitirUtilizadorNuloParaTransicoesAutomaticas() {
		// Ex.: MarcarFDSObsoletasUseCase, o job agendado — sem utilizador
		// humano por trás da decisão (RF12/RNF03, Fase 5 Parte 2).
		AuditoriaRepositoryPortFalso repositorio = new AuditoriaRepositoryPortFalso();
		RegistarAuditoriaUseCase useCase = new RegistarAuditoriaUseCase(repositorio);

		useCase.executar(FDSId.gerar(), EstadoFDS.ATUALIZADA, EstadoFDS.OBSOLETA,
				Instant.parse("2026-06-01T10:00:00Z"), null);

		assertThat(repositorio.registados.get(0).utilizador()).isNull();
	}

	private static class AuditoriaRepositoryPortFalso implements AuditoriaRepositoryPort {
		private final List<RegistoAuditoriaFDS> registados = new ArrayList<>();

		@Override
		public void registar(RegistoAuditoriaFDS registo) {
			registados.add(registo);
		}

		@Override
		public List<RegistoAuditoriaFDS> listarPorFDS(FDSId fdsId) {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}
	}
}
