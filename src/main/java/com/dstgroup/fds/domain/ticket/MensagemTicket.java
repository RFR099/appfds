package com.dstgroup.fds.domain.ticket;

import java.time.Instant;
import java.util.Objects;

/**
 * Uma mensagem trocada no histórico de um {@link TicketFDS}.
 *
 * <p>{@code dataEnvio} é recebida por parâmetro (nunca {@code Instant.now()}
 * interno) — quem decide "agora" é sempre o caso de uso, através do
 * {@code Clock} injetado, mantendo a mesma disciplina de determinismo já
 * seguida em {@code DataValidade} e {@code PoliticaValidadeFDS}. É
 * particularmente importante aqui porque os Alertas (Fase 4, Parte 6) vão
 * calcular "dias desde a última mensagem" a partir deste campo.</p>
 */
public record MensagemTicket(String autor, String texto, Instant dataEnvio) {

	public MensagemTicket {
		if (autor == null || autor.isBlank()) {
			throw new MensagemTicketInvalidaException("O autor da mensagem não pode ser vazio ou nulo.");
		}
		if (texto == null || texto.isBlank()) {
			throw new MensagemTicketInvalidaException("O texto da mensagem não pode ser vazio ou nulo.");
		}
		Objects.requireNonNull(dataEnvio, "A data de envio da mensagem não pode ser nula.");
	}
}
