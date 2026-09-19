package com.dstgroup.fds.domain.fds;

import static com.dstgroup.fds.domain.fds.EstadoFDS.ATUALIZADA;
import static com.dstgroup.fds.domain.fds.EstadoFDS.OBSOLETA;
import static com.dstgroup.fds.domain.fds.EstadoFDS.RASCUNHO;
import static com.dstgroup.fds.domain.fds.EstadoFDS.SOLICITADA_AO_FORNECEDOR;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class EstadoFDSTest {

	// --- Casos de negócio nomeados (documentam o "porquê" de cada transição) ---

	@Test
	void deveTransitarDeRascunhoParaAtualizada() {
		assertThat(RASCUNHO.podeTransitarPara(ATUALIZADA)).isTrue();
		assertThat(RASCUNHO.transicionarPara(ATUALIZADA)).isEqualTo(ATUALIZADA);
	}

	@Test
	void deveTransitarDeRascunhoParaSolicitadaAoFornecedor() {
		assertThat(RASCUNHO.podeTransitarPara(SOLICITADA_AO_FORNECEDOR)).isTrue();
	}

	@Test
	void deveTransitarDeAtualizadaParaObsoleta() {
		assertThat(ATUALIZADA.podeTransitarPara(OBSOLETA)).isTrue();
		assertThat(ATUALIZADA.transicionarPara(OBSOLETA)).isEqualTo(OBSOLETA);
	}

	@Test
	void deveTransitarDeSolicitadaAoFornecedorParaAtualizadaQuandoFornecedorResponde() {
		assertThat(SOLICITADA_AO_FORNECEDOR.podeTransitarPara(ATUALIZADA)).isTrue();
	}

	@Test
	void deveTransitarDeObsoletaParaRascunhoParaIniciarNovaRevisao() {
		// Uma FDS obsoleta só volta a ficar "ativa" reentrando no fluxo de
		// rascunho — nunca diretamente para Atualizada (ver invariante do agregado).
		assertThat(OBSOLETA.podeTransitarPara(RASCUNHO)).isTrue();
	}

	@Test
	void naoDeveTransitarDeObsoletaParaAtualizadaDiretamente() {
		assertThat(OBSOLETA.podeTransitarPara(ATUALIZADA)).isFalse();

		assertThatThrownBy(() -> OBSOLETA.transicionarPara(ATUALIZADA))
				.isInstanceOf(TransicaoEstadoInvalidaException.class)
				.hasMessageContaining("OBSOLETA")
				.hasMessageContaining("ATUALIZADA");
	}

	@Test
	void naoDeveTransitarDeObsoletaParaSolicitadaAoFornecedorDiretamente() {
		assertThat(OBSOLETA.podeTransitarPara(SOLICITADA_AO_FORNECEDOR)).isFalse();
	}

	@Test
	void naoDevePermanecerNoMesmoEstadoComoTransicao() {
		assertThat(RASCUNHO.podeTransitarPara(RASCUNHO)).isFalse();
		assertThat(ATUALIZADA.podeTransitarPara(ATUALIZADA)).isFalse();
	}

	// --- Cobertura total da matriz 4x4 (16 combinações) ---

	@ParameterizedTest(name = "{0} -> {1} deveria ser permitido = {2}")
	@MethodSource("todasAsCombinacoesDeTransicao")
	void matrizDeTransicoesCompleta(EstadoFDS origem, EstadoFDS destino, boolean permitido) {
		assertThat(origem.podeTransitarPara(destino)).isEqualTo(permitido);
	}

	static Stream<Arguments> todasAsCombinacoesDeTransicao() {
		return Stream.of(
				// de RASCUNHO
				Arguments.of(RASCUNHO, RASCUNHO, false),
				Arguments.of(RASCUNHO, ATUALIZADA, true),
				Arguments.of(RASCUNHO, SOLICITADA_AO_FORNECEDOR, true),
				Arguments.of(RASCUNHO, OBSOLETA, false),
				// de ATUALIZADA
				Arguments.of(ATUALIZADA, RASCUNHO, false),
				Arguments.of(ATUALIZADA, ATUALIZADA, false),
				Arguments.of(ATUALIZADA, SOLICITADA_AO_FORNECEDOR, true),
				Arguments.of(ATUALIZADA, OBSOLETA, true),
				// de SOLICITADA_AO_FORNECEDOR
				Arguments.of(SOLICITADA_AO_FORNECEDOR, RASCUNHO, false),
				Arguments.of(SOLICITADA_AO_FORNECEDOR, ATUALIZADA, true),
				Arguments.of(SOLICITADA_AO_FORNECEDOR, SOLICITADA_AO_FORNECEDOR, false),
				Arguments.of(SOLICITADA_AO_FORNECEDOR, OBSOLETA, true),
				// de OBSOLETA
				Arguments.of(OBSOLETA, RASCUNHO, true),
				Arguments.of(OBSOLETA, ATUALIZADA, false),
				Arguments.of(OBSOLETA, SOLICITADA_AO_FORNECEDOR, false),
				Arguments.of(OBSOLETA, OBSOLETA, false)
		);
	}
}
