package com.dstgroup.fds.domain.ticket;

import com.dstgroup.fds.domain.shared.DomainException;

public class TransicaoEstadoTicketInvalidaException extends DomainException {

	public TransicaoEstadoTicketInvalidaException(EstadoTicket origem, EstadoTicket destino) {
		super("Transição de estado de ticket inválida: " + origem + " -> " + destino);
	}
}
