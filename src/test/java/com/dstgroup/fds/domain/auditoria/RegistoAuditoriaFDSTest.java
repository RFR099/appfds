package com.dstgroup.fds.domain.auditoria;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatNoException;

import java.time.Instant;

import org.junit.jupiter.api.Test;

import com.dstgroup.fds.domain.fds.EstadoFDS;
import com.dstgroup.fds.domain.fds.FDSId;

class RegistoAuditoriaFDSTest {

	private static final FDSId FDS_ID = FDSId.gerar();
	private static final Instant AGORA = Instant.parse("2026-06-01T10:00:00Z");

	@Test
	void deveCriarRegistoValidoComTodosOsCampos() {
		RegistoAuditoriaFDS registo = new RegistoAuditoriaFDS(FDS_ID, EstadoFDS.ATUALIZADA, EstadoFDS.OBSOLETA, AGORA,
				"gestor.dev");

		assertThat(registo.fdsId()).isEqualTo(FDS_ID);
		assertThat(registo.estadoAnterior()).isEqualTo(EstadoFDS.ATUALIZADA);
		assertThat(registo.estadoNovo()).isEqualTo(EstadoFDS.OBSOLETA);
		assertThat(registo.ocorridoEm()).isEqualTo(AGORA);
		assertThat(registo.utilizador()).isEqualTo("gestor.dev");
	}

	@Test
	void deveRejeitarFdsIdNulo() {
		assertThatThrownBy(() -> new RegistoAuditoriaFDS(null, EstadoFDS.ATUALIZADA, EstadoFDS.OBSOLETA, AGORA, null))
				.isInstanceOf(NullPointerException.class);
	}

	@Test
	void deveRejeitarEstadoAnteriorNulo() {
		assertThatThrownBy(() -> new RegistoAuditoriaFDS(FDS_ID, null, EstadoFDS.OBSOLETA, AGORA, null))
				.isInstanceOf(NullPointerException.class);
	}

	@Test
	void deveRejeitarEstadoNovoNulo() {
		assertThatThrownBy(() -> new RegistoAuditoriaFDS(FDS_ID, EstadoFDS.ATUALIZADA, null, AGORA, null))
				.isInstanceOf(NullPointerException.class);
	}

	@Test
	void deveRejeitarOcorridoEmNulo() {
		assertThatThrownBy(() -> new RegistoAuditoriaFDS(FDS_ID, EstadoFDS.ATUALIZADA, EstadoFDS.OBSOLETA, null, null))
				.isInstanceOf(NullPointerException.class);
	}

	@Test
	void devePermitirEstadoAnteriorIgualAoNovo() {
		// não é papel do registo de auditoria decidir se uma transição "faz
		// sentido" — essa invariante já foi garantida por EstadoFDS antes do
		// evento ser emitido; o registo só armazena o facto ocorrido.
		assertThatNoException().isThrownBy(
				() -> new RegistoAuditoriaFDS(FDS_ID, EstadoFDS.ATUALIZADA, EstadoFDS.ATUALIZADA, AGORA, null));
	}

	@Test
	void devePermitirUtilizadorNuloQuandoATransicaoENoAutomatica() {
		// Ao contrário dos outros campos, "utilizador" não tem
		// requireNonNull — é o caso legítimo do job agendado de
		// obsolescência (RF12/RNF03, Fase 5 Parte 2, ver javadoc da classe).
		assertThatNoException().isThrownBy(
				() -> new RegistoAuditoriaFDS(FDS_ID, EstadoFDS.ATUALIZADA, EstadoFDS.OBSOLETA, AGORA, null));
	}
}
