package com.dstgroup.fds.domain.ticket;

import java.util.Objects;
import java.util.UUID;

import com.dstgroup.fds.domain.shared.IdentificadorInvalidoException;

public record TicketFDSId(UUID valor) {

	public TicketFDSId {
		Objects.requireNonNull(valor, "O id do ticket não pode ser nulo.");
	}

	public static TicketFDSId gerar() {
		return new TicketFDSId(UUID.randomUUID());
	}

	/**
	 * @throws IdentificadorInvalidoException (Fase 5, Parte 3) se {@code valor}
	 * não for um {@link UUID} válido — ver javadoc de
	 * {@code com.dstgroup.fds.domain.fds.FDSId#de}.
	 */
	public static TicketFDSId de(String valor) {
		try {
			return new TicketFDSId(UUID.fromString(valor));
		} catch (IllegalArgumentException e) {
			throw new IdentificadorInvalidoException("Id de ticket", valor);
		}
	}

	@Override
	public String toString() {
		return valor.toString();
	}
}
