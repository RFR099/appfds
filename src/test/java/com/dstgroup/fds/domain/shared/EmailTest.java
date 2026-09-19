package com.dstgroup.fds.domain.shared;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class EmailTest {

	@Test
	void deveAceitarFormatoValido() {
		Email email = new Email("gestor.dev@dstgroup.local");

		assertThat(email.valor()).isEqualTo("gestor.dev@dstgroup.local");
	}

	@ParameterizedTest
	@ValueSource(strings = {
			"sem-arroba.com",
			"@sem-utilizador.com",
			"sem-dominio@",
			"com espaço@dstgroup.local",
			"duplo@@dstgroup.local"
	})
	void deveRejeitarFormatoInvalido(String valorInvalido) {
		assertThatThrownBy(() -> new Email(valorInvalido))
				.isInstanceOf(EmailInvalidoException.class)
				.hasMessageContaining(valorInvalido);
	}

	@Test
	void deveRejeitarValorNulo() {
		assertThatThrownBy(() -> new Email(null))
				.isInstanceOf(EmailInvalidoException.class);
	}

	@Test
	void deveRejeitarValorEmBranco() {
		assertThatThrownBy(() -> new Email("   "))
				.isInstanceOf(EmailInvalidoException.class);
	}

	@Test
	void deveNormalizarEspacosEmBrancoNasExtremidades() {
		Email email = new Email("  gestor.dev@dstgroup.local  ");

		assertThat(email.valor()).isEqualTo("gestor.dev@dstgroup.local");
	}

	@Test
	void deveSerIgualPorValorNaoPorReferencia() {
		Email a = new Email("gestor.dev@dstgroup.local");
		Email b = new Email("gestor.dev@dstgroup.local");

		assertThat(a).isEqualTo(b);
		assertThat(a.hashCode()).isEqualTo(b.hashCode());
	}

	@Test
	void deveSerDiferenteDeEmailComValorDistinto() {
		Email a = new Email("gestor.dev@dstgroup.local");
		Email b = new Email("admin.dev@dstgroup.local");

		assertThat(a).isNotEqualTo(b);
	}
}
