package com.dstgroup.fds.domain.ticket;

import com.dstgroup.fds.domain.shared.DomainException;

public class TicketFDSFechadoException extends DomainException {

	public TicketFDSFechadoException() {
		super("Não é possível adicionar mensagens a um ticket já fechado.");
	}
}
