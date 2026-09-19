package com.dstgroup.fds.domain.fds;

import java.util.Objects;
import java.util.UUID;

import com.dstgroup.fds.domain.shared.IdentificadorInvalidoException;

/**
 * Identidade do agregado {@link FichaDadosSeguranca}.
 *
 * <p>Encapsula o {@link UUID} para não espalhar o tipo primitivo pelo
 * domínio/application e para poder evoluir a estratégia de geração de id no
 * futuro sem afetar quem já depende de {@code FDSId}.</p>
 */
public record FDSId(UUID valor) {

	public FDSId {
		Objects.requireNonNull(valor, "O id da FDS não pode ser nulo.");
	}

	public static FDSId gerar() {
		return new FDSId(UUID.randomUUID());
	}

	/**
	 * @throws IdentificadorInvalidoException (Fase 5, Parte 3) se {@code valor}
	 * não for um {@link UUID} válido — nunca deixa propagar a
	 * {@link IllegalArgumentException} crua de {@code UUID.fromString}, que
	 * não seria apanhada por nenhum {@code @ExceptionHandler} e resultaria
	 * num 500 para o que é um erro do cliente (id mal formado no URL).
	 */
	public static FDSId de(String valor) {
		try {
			return new FDSId(UUID.fromString(valor));
		} catch (IllegalArgumentException e) {
			throw new IdentificadorInvalidoException("Id de FDS", valor);
		}
	}

	@Override
	public String toString() {
		return valor.toString();
	}
}
