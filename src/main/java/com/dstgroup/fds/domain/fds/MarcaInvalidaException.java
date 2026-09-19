package com.dstgroup.fds.domain.fds;

import com.dstgroup.fds.domain.shared.DomainException;

/**
 * Lançada quando se tenta construir uma {@link Marca} com um valor nulo, em
 * branco, ou que excede o tamanho máximo permitido.
 */
public class MarcaInvalidaException extends DomainException {

	public MarcaInvalidaException(String mensagem) {
		super(mensagem);
	}
}
