package com.dstgroup.fds.domain.ticket;

import com.dstgroup.fds.domain.shared.DomainException;

/**
 * Lançada quando se pede um ticket por um {@link TicketFDSId} que não
 * existe. Traduzida pela presentation layer para um {@code 404 Not Found}.
 */
public class TicketFDSNaoEncontradoException extends DomainException {

	public TicketFDSNaoEncontradoException(TicketFDSId id) {
		super("Não foi encontrado nenhum ticket com o id '" + id + "'.");
	}
}
