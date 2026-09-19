package com.dstgroup.fds.domain.shared;

/**
 * Lançada quando se tenta construir um {@link Email} com um valor nulo, em
 * branco ou que não respeita o formato de um endereço de e-mail.
 */
public class EmailInvalidoException extends DomainException {

	public EmailInvalidoException(String valorInvalido) {
		super("E-mail inválido: '" + valorInvalido + "'");
	}
}
