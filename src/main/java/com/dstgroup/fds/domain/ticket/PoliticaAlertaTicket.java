package com.dstgroup.fds.domain.ticket;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Domain service que decide se um {@link TicketFDS} deve gerar um alerta de
 * "sem resposta do fornecedor" (RF09).
 *
 * <p>Tal como {@code PoliticaValidadeFDS}, nunca chama {@code Instant.now()}
 * internamente — recebe sempre a data/hora de referência por parâmetro,
 * mantendo a política determinística e testável sem esperas reais.</p>
 */
public final class PoliticaAlertaTicket {

	private PoliticaAlertaTicket() {
	}

	/**
	 * @param diasSemResposta quantos dias desde a abertura, sem o ticket sair
	 *                         de {@link EstadoTicket#ABERTO}, até gerar
	 *                         alerta (RF09; parametrizável — ver
	 *                         {@code app.alertas.ticket-dias-sem-resposta}).
	 * @return {@code true} se o ticket ainda está {@code ABERTO} (nenhuma
	 * resposta o levou a {@code RESPONDIDO}, nem foi {@code FECHADO}) e já
	 * passaram pelo menos {@code diasSemResposta} dias desde a abertura.
	 */
	public static boolean deveGerarAlertaSemResposta(TicketFDS ticket, Instant dataReferencia, int diasSemResposta) {
		if (ticket.estado() != EstadoTicket.ABERTO) {
			return false;
		}
		Instant limite = ticket.dataAbertura().plus(diasSemResposta, ChronoUnit.DAYS);
		return !dataReferencia.isBefore(limite);
	}
}
