package com.dstgroup.fds.application.dto;

import java.util.List;

/**
 * Resposta do "badge" de Alertas (RF09) — {@code total} é o número mostrado
 * no menu lateral; as duas listas suportam o ecrã "Alertas" onde o
 * utilizador vê o detalhe do que está a alertar.
 */
public record AlertasResponse(int total, List<AlertaFDSResponse> fdsAExpirar,
		List<AlertaTicketResponse> ticketsSemResposta) {
}
