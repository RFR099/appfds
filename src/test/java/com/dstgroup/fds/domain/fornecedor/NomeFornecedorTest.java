package com.dstgroup.fds.domain.fornecedor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class NomeFornecedorTest {

	@Test
	void deveAceitarNomeValido() {
		NomeFornecedor nome = new NomeFornecedor("Industrial Química Riojana S.A");

		assertThat(nome.valor()).isEqualTo("Industrial Química Riojana S.A");
	}

	@ParameterizedTest
	@NullAndEmptySource
	@ValueSource(strings = { "   ", "\t" })
	void deveRejeitarNomeNuloVazioOuEmBranco(String valorInvalido) {
		assertThatThrownBy(() -> new NomeFornecedor(valorInvalido))
				.isInstanceOf(NomeFornecedorInvalidoException.class);
	}

	@Test
	void deveNormalizarEspacosEmBrancoNasExtremidades() {
		NomeFornecedor nome = new NomeFornecedor("   3M   ");

		assertThat(nome.valor()).isEqualTo("3M");
	}

	@Test
	void deveRejeitarNomeComMaisDeCentoECinquentaCaracteres() {
		String nomeMuitoLongo = "A".repeat(151);

		assertThatThrownBy(() -> new NomeFornecedor(nomeMuitoLongo))
				.isInstanceOf(NomeFornecedorInvalidoException.class)
				.hasMessageContaining("150");
	}

	@Test
	void deveAceitarNomeComExatamenteCentoECinquentaCaracteres() {
		NomeFornecedor nome = new NomeFornecedor("A".repeat(150));

		assertThat(nome.valor()).hasSize(150);
	}

	@Test
	void deveSerIgualPorValorNaoPorReferencia() {
		NomeFornecedor a = new NomeFornecedor("3M");
		NomeFornecedor b = new NomeFornecedor("3M");

		assertThat(a).isEqualTo(b);
		assertThat(a.hashCode()).isEqualTo(b.hashCode());
	}
}
