package com.dstgroup.fds.domain.ticket;

import com.dstgroup.fds.domain.shared.DomainException;

public class MensagemTicketInvalidaException extends DomainException {

	public MensagemTicketInvalidaException(String mensagem) {
		super(mensagem);
	}
}
