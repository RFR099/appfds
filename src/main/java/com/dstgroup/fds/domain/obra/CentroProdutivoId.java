package com.dstgroup.fds.domain.obra;

import java.util.Objects;
import java.util.UUID;

import com.dstgroup.fds.domain.shared.IdentificadorInvalidoException;

public record CentroProdutivoId(UUID valor) {

	public CentroProdutivoId {
		Objects.requireNonNull(valor, "O id do centro produtivo não pode ser nulo.");
	}

	public static CentroProdutivoId gerar() {
		return new CentroProdutivoId(UUID.randomUUID());
	}

	/**
	 * @throws IdentificadorInvalidoException (Fase 5, Parte 3) se {@code valor}
	 * não for um {@link UUID} válido — ver javadoc de
	 * {@code FDSId#de}.
	 */
	public static CentroProdutivoId de(String valor) {
		try {
			return new CentroProdutivoId(UUID.fromString(valor));
		} catch (IllegalArgumentException e) {
			throw new IdentificadorInvalidoException("Id de centro produtivo", valor);
		}
	}

	@Override
	public String toString() {
		return valor.toString();
	}
}
