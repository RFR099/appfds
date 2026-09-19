package com.dstgroup.fds.application.usecase;

import com.dstgroup.fds.application.TicketFDSMapper;
import com.dstgroup.fds.application.dto.TicketFDSResponse;
import com.dstgroup.fds.application.port.out.TicketFDSRepositoryPort;
import com.dstgroup.fds.domain.ticket.TicketFDS;
import com.dstgroup.fds.domain.ticket.TicketFDSId;
import com.dstgroup.fds.domain.ticket.TicketFDSNaoEncontradoException;

public class ObterTicketUseCase {

	private final TicketFDSRepositoryPort repositorio;

	public ObterTicketUseCase(TicketFDSRepositoryPort repositorio) {
		this.repositorio = repositorio;
	}

	public TicketFDSResponse executar(String id) {
		TicketFDSId ticketId = TicketFDSId.de(id);
		TicketFDS ticket = repositorio.obterPorId(ticketId)
				.orElseThrow(() -> new TicketFDSNaoEncontradoException(ticketId));
		return TicketFDSMapper.paraResponse(ticket);
	}
}
