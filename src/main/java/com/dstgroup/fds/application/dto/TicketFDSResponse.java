package com.dstgroup.fds.application.dto;

import java.util.List;

public record TicketFDSResponse(String id, String fdsId, String fornecedorId, String estado, String dataAbertura,
		List<MensagemTicketResponse> mensagens) {
}
