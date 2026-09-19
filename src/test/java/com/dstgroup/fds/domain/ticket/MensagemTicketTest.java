package com.dstgroup.fds.domain.ticket;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class MensagemTicketTest {

	private static final Instant AGORA = Instant.parse("2026-06-01T10:00:00Z");

	@Test
	void deveCriarMensagemValida() {
		MensagemTicket mensagem = new MensagemTicket("gestor@dstgroup.pt", "Por favor enviem a FDS atualizada.", AGORA);

		assertThat(mensagem.autor()).isEqualTo("gestor@dstgroup.pt");
		assertThat(mensagem.texto()).isEqualTo("Por favor enviem a FDS atualizada.");
		assertThat(mensagem.dataEnvio()).isEqualTo(AGORA);
	}

	@ParameterizedTest
	@NullAndEmptySource
	@ValueSource(strings = { "   " })
	void deveRejeitarAutorNuloVazioOuEmBranco(String autorInvalido) {
		assertThatThrownBy(() -> new MensagemTicket(autorInvalido, "texto", AGORA))
				.isInstanceOf(MensagemTicketInvalidaException.class);
	}

	@ParameterizedTest
	@NullAndEmptySource
	@ValueSource(strings = { "   " })
	void deveRejeitarTextoNuloVazioOuEmBranco(String textoInvalido) {
		assertThatThrownBy(() -> new MensagemTicket("autor", textoInvalido, AGORA))
				.isInstanceOf(MensagemTicketInvalidaException.class);
	}

	@Test
	void deveRejeitarDataEnvioNula() {
		assertThatThrownBy(() -> new MensagemTicket("autor", "texto", null))
				.isInstanceOf(NullPointerException.class);
	}

	@Test
	void deveSerIgualPorValor() {
		MensagemTicket a = new MensagemTicket("autor", "texto", AGORA);
		MensagemTicket b = new MensagemTicket("autor", "texto", AGORA);

		assertThat(a).isEqualTo(b);
	}
}
