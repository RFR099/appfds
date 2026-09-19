package com.dstgroup.fds.domain.ticket;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;

import org.junit.jupiter.api.Test;

import com.dstgroup.fds.domain.fornecedor.FornecedorId;

class PoliticaAlertaTicketTest {

	private static final Instant ABERTURA = Instant.parse("2026-06-01T10:00:00Z");
	private static final int DIAS_SEM_RESPOSTA = 5;

	@Test
	void naoDeveGerarAlertaAntesDeAtingirOPrazo() {
		TicketFDS ticket = TicketFDS.abrir(null, FornecedorId.gerar(), ABERTURA);

		boolean resultado = PoliticaAlertaTicket.deveGerarAlertaSemResposta(
				ticket, ABERTURA.plusSeconds(60 * 60 * 24 * 4), DIAS_SEM_RESPOSTA);

		assertThat(resultado).isFalse();
	}

	@Test
	void deveGerarAlertaNoDiaExatoDoPrazo() {
		TicketFDS ticket = TicketFDS.abrir(null, FornecedorId.gerar(), ABERTURA);

		boolean resultado = PoliticaAlertaTicket.deveGerarAlertaSemResposta(
				ticket, ABERTURA.plusSeconds(60L * 60 * 24 * DIAS_SEM_RESPOSTA), DIAS_SEM_RESPOSTA);

		assertThat(resultado).isTrue();
	}

	@Test
	void deveGerarAlertaMuitoDepoisDoPrazo() {
		TicketFDS ticket = TicketFDS.abrir(null, FornecedorId.gerar(), ABERTURA);

		boolean resultado = PoliticaAlertaTicket.deveGerarAlertaSemResposta(
				ticket, ABERTURA.plusSeconds(60L * 60 * 24 * 30), DIAS_SEM_RESPOSTA);

		assertThat(resultado).isTrue();
	}

	@Test
	void naoDeveGerarAlertaSeTicketJaFoiRespondido() {
		TicketFDS ticket = TicketFDS.abrir(null, FornecedorId.gerar(), ABERTURA);
		ticket.marcarComoRespondido();

		boolean resultado = PoliticaAlertaTicket.deveGerarAlertaSemResposta(
				ticket, ABERTURA.plusSeconds(60L * 60 * 24 * 30), DIAS_SEM_RESPOSTA);

		assertThat(resultado).isFalse();
	}

	@Test
	void naoDeveGerarAlertaSeTicketJaFoiFechado() {
		TicketFDS ticket = TicketFDS.abrir(null, FornecedorId.gerar(), ABERTURA);
		ticket.fechar();

		boolean resultado = PoliticaAlertaTicket.deveGerarAlertaSemResposta(
				ticket, ABERTURA.plusSeconds(60L * 60 * 24 * 30), DIAS_SEM_RESPOSTA);

		assertThat(resultado).isFalse();
	}
}
