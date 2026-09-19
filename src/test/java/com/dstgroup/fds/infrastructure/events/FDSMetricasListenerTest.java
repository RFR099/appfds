package com.dstgroup.fds.infrastructure.events;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;

import org.junit.jupiter.api.Test;

import com.dstgroup.fds.application.port.out.MetricasPort;
import com.dstgroup.fds.domain.fds.EstadoFDS;
import com.dstgroup.fds.domain.fds.FDSCriadaEvent;
import com.dstgroup.fds.domain.fds.FDSEstadoAlteradoEvent;
import com.dstgroup.fds.domain.fds.FDSId;

/**
 * Testa {@link FDSMetricasListener} invocando os métodos anotados com
 * {@code @EventListener} diretamente como métodos Java normais — a mesma
 * técnica usada em {@code GlobalExceptionHandlerTest} (Fase 5, Parte 3): a
 * anotação só importa quando é o Spring a invocar o método, o método em si
 * é uma função pura e determinística.
 */
class FDSMetricasListenerTest {

	private final MetricasPortFalso metricas = new MetricasPortFalso();
	private final FDSMetricasListener listener = new FDSMetricasListener(metricas);

	@Test
	void aoCriar_incrementaFDSCriadas() {
		listener.aoCriar(new FDSCriadaEvent(FDSId.gerar(), Instant.now()));

		assertThat(metricas.fdsCriadas).isEqualTo(1);
		assertThat(metricas.fdsMarcadasObsoletas).isZero();
		assertThat(metricas.ticketsAbertos).isZero();
	}

	@Test
	void aoAlterarEstadoParaObsoleta_incrementaFDSMarcadasObsoletas() {
		listener.aoAlterarEstado(new FDSEstadoAlteradoEvent(
				FDSId.gerar(), EstadoFDS.ATUALIZADA, EstadoFDS.OBSOLETA, Instant.now(), null));

		assertThat(metricas.fdsMarcadasObsoletas).isEqualTo(1);
		assertThat(metricas.fdsCriadas).isZero();
	}

	@Test
	void aoAlterarEstadoParaOutroEstado_naoIncrementaNada() {
		// só OBSOLETA é uma métrica de negócio relevante — as restantes
		// transições (ex.: RASCUNHO -> ATUALIZADA) não são "obsolescência".
		listener.aoAlterarEstado(new FDSEstadoAlteradoEvent(
				FDSId.gerar(), EstadoFDS.RASCUNHO, EstadoFDS.ATUALIZADA, Instant.now(), "gestor.dev"));

		assertThat(metricas.fdsMarcadasObsoletas).isZero();
	}

	@Test
	void aoCriar_chamadoVariasVezes_incrementaUmaVezPorChamada() {
		listener.aoCriar(new FDSCriadaEvent(FDSId.gerar(), Instant.now()));
		listener.aoCriar(new FDSCriadaEvent(FDSId.gerar(), Instant.now()));
		listener.aoCriar(new FDSCriadaEvent(FDSId.gerar(), Instant.now()));

		assertThat(metricas.fdsCriadas).isEqualTo(3);
	}

	private static class MetricasPortFalso implements MetricasPort {
		private int fdsCriadas = 0;
		private int fdsMarcadasObsoletas = 0;
		private int ticketsAbertos = 0;

		@Override
		public void incrementarFDSCriadas() {
			fdsCriadas++;
		}

		@Override
		public void incrementarFDSMarcadasObsoletas() {
			fdsMarcadasObsoletas++;
		}

		@Override
		public void incrementarTicketsAbertos() {
			ticketsAbertos++;
		}
	}
}
