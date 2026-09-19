package com.dstgroup.fds.application;

import java.util.List;

import com.dstgroup.fds.application.dto.MensagemTicketResponse;
import com.dstgroup.fds.application.dto.TicketFDSResponse;
import com.dstgroup.fds.domain.ticket.TicketFDS;

/**
 * Converte o agregado {@link TicketFDS} para os DTOs de saída da
 * Application. O domínio nunca conhece este mapper.
 */
public final class TicketFDSMapper {

	private TicketFDSMapper() {
	}

	public static TicketFDSResponse paraResponse(TicketFDS ticket) {
		List<MensagemTicketResponse> mensagens = ticket.mensagens().stream()
				.map(m -> new MensagemTicketResponse(m.autor(), m.texto(), m.dataEnvio().toString()))
				.toList();
		return new TicketFDSResponse(
				ticket.id().toString(),
				ticket.fdsId() == null ? null : ticket.fdsId().toString(),
				ticket.fornecedorId().toString(),
				ticket.estado().name(),
				ticket.dataAbertura().toString(),
				mensagens
		);
	}
}
