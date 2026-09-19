package com.dstgroup.fds.domain.fds;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;

class DataValidadeTest {

	private static final LocalDate REVISAO = LocalDate.of(2026, 1, 1);
	private static final LocalDate VALIDADE = LocalDate.of(2027, 1, 1);

	@Test
	void deveAceitarDataValidadePosteriorADataRevisao() {
		DataValidade dataValidade = new DataValidade(REVISAO, VALIDADE);

		assertThat(dataValidade.dataRevisao()).isEqualTo(REVISAO);
		assertThat(dataValidade.dataValidade()).isEqualTo(VALIDADE);
	}

	@Test
	void deveRejeitarDataValidadeAnteriorADataRevisao() {
		LocalDate validadeAnterior = REVISAO.minusDays(1);

		assertThatThrownBy(() -> new DataValidade(REVISAO, validadeAnterior))
				.isInstanceOf(DataValidadeInvalidaException.class)
				.hasMessageContaining(REVISAO.toString())
				.hasMessageContaining(validadeAnterior.toString());
	}

	@Test
	void deveRejeitarDataValidadeIgualADataRevisao() {
		// tem de ser estritamente posterior — uma FDS não pode "expirar no dia em que é revista"
		assertThatThrownBy(() -> new DataValidade(REVISAO, REVISAO))
				.isInstanceOf(DataValidadeInvalidaException.class);
	}

	@Test
	void deveRejeitarDataRevisaoNula() {
		assertThatThrownBy(() -> new DataValidade(null, VALIDADE))
				.isInstanceOf(DataValidadeInvalidaException.class)
				.hasMessageContaining("revisão");
	}

	@Test
	void deveRejeitarDataValidadeNula() {
		assertThatThrownBy(() -> new DataValidade(REVISAO, null))
				.isInstanceOf(DataValidadeInvalidaException.class)
				.hasMessageContaining("validade");
	}

	@Test
	void naoDeveEstarExpiradaAntesDaDataDeValidade() {
		DataValidade dataValidade = new DataValidade(REVISAO, VALIDADE);

		assertThat(dataValidade.estaExpirada(VALIDADE.minusDays(1))).isFalse();
	}

	@Test
	void naoDeveEstarExpiradaNoProprioDiaDaDataDeValidade() {
		// válida até e incluindo o próprio dia da data de validade
		DataValidade dataValidade = new DataValidade(REVISAO, VALIDADE);

		assertThat(dataValidade.estaExpirada(VALIDADE)).isFalse();
	}

	@Test
	void deveEstarExpiradaNoDiaSeguinteADataDeValidade() {
		DataValidade dataValidade = new DataValidade(REVISAO, VALIDADE);

		assertThat(dataValidade.estaExpirada(VALIDADE.plusDays(1))).isTrue();
	}

	@Test
	void deveSerIgualPorValorNaoPorReferencia() {
		DataValidade a = new DataValidade(REVISAO, VALIDADE);
		DataValidade b = new DataValidade(REVISAO, VALIDADE);

		assertThat(a).isEqualTo(b);
		assertThat(a.hashCode()).isEqualTo(b.hashCode());
	}
}
