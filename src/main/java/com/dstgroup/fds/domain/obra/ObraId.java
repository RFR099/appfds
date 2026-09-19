package com.dstgroup.fds.domain.obra;

import java.util.Objects;
import java.util.UUID;

import com.dstgroup.fds.domain.shared.IdentificadorInvalidoException;

public record ObraId(UUID valor) {

	public ObraId {
		Objects.requireNonNull(valor, "O id da obra não pode ser nulo.");
	}

	public static ObraId gerar() {
		return new ObraId(UUID.randomUUID());
	}

	/**
	 * @throws IdentificadorInvalidoException (Fase 5, Parte 3) se {@code valor}
	 * não for um {@link UUID} válido — ver javadoc de
	 * {@code FDSId#de}.
	 */
	public static ObraId de(String valor) {
		try {
			return new ObraId(UUID.fromString(valor));
		} catch (IllegalArgumentException e) {
			throw new IdentificadorInvalidoException("Id de obra", valor);
		}
	}

	@Override
	public String toString() {
		return valor.toString();
	}
}
