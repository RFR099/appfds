package com.dstgroup.fds.application;

import com.dstgroup.fds.application.dto.AlertaFDSResponse;
import com.dstgroup.fds.application.dto.AlertaTicketResponse;
import com.dstgroup.fds.domain.fds.FichaDadosSeguranca;
import com.dstgroup.fds.domain.ticket.TicketFDS;

public final class AlertaMapper {

	private AlertaMapper() {
	}

	public static AlertaFDSResponse paraFDSResponse(FichaDadosSeguranca fds) {
		return new AlertaFDSResponse(
				fds.id().toString(),
				fds.nomeProdutoQuimico(),
				fds.marca().nome(),
				fds.dataValidade().dataValidade().toString()
		);
	}

	public static AlertaTicketResponse paraTicketResponse(TicketFDS ticket) {
		return new AlertaTicketResponse(
				ticket.id().toString(),
				ticket.fornecedorId().toString(),
				ticket.dataAbertura().toString()
		);
	}
}
