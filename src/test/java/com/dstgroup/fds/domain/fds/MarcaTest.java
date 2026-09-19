package com.dstgroup.fds.domain.fds;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class MarcaTest {

	@Test
	void deveAceitarNomeValido() {
		Marca marca = new Marca("3M");

		assertThat(marca.nome()).isEqualTo("3M");
	}

	@ParameterizedTest
	@NullAndEmptySource
	@ValueSource(strings = { "   ", "\t", "\n" })
	void deveRejeitarNomeNuloVazioOuEmBranco(String valorInvalido) {
		assertThatThrownBy(() -> new Marca(valorInvalido))
				.isInstanceOf(MarcaInvalidaException.class);
	}

	@Test
	void deveNormalizarEspacosEmBrancoNasExtremidades() {
		Marca marca = new Marca("   3M   ");

		assertThat(marca.nome()).isEqualTo("3M");
	}

	@Test
	void deveRejeitarNomeComMaisDeCemCaracteres() {
		String nomeMuitoLongo = "A".repeat(101);

		assertThatThrownBy(() -> new Marca(nomeMuitoLongo))
				.isInstanceOf(MarcaInvalidaException.class)
				.hasMessageContaining("100");
	}

	@Test
	void deveAceitarNomeComExatamenteCemCaracteres() {
		String nomeNoLimite = "A".repeat(100);

		Marca marca = new Marca(nomeNoLimite);

		assertThat(marca.nome()).hasSize(100);
	}

	@Test
	void deveSerIgualPorValorNaoPorReferencia() {
		Marca a = new Marca("3M");
		Marca b = new Marca("3M");

		assertThat(a).isEqualTo(b);
		assertThat(a.hashCode()).isEqualTo(b.hashCode());
	}

	@Test
	void deveSerDiferenteDeMarcaComNomeDistinto() {
		Marca a = new Marca("3M");
		Marca b = new Marca("A2Brios");

		assertThat(a).isNotEqualTo(b);
	}
}
