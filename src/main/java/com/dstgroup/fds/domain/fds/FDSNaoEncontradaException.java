package com.dstgroup.fds.domain.fds;

import com.dstgroup.fds.domain.shared.DomainException;

/**
 * Lançada quando se pede uma FDS por um {@link FDSId} que não existe.
 *
 * <p>Traduzida pela presentation layer (Parte 10) para um {@code 404 Not Found}.</p>
 */
public class FDSNaoEncontradaException extends DomainException {

	public FDSNaoEncontradaException(FDSId id) {
		super("Não foi encontrada nenhuma FDS com o id '" + id + "'.");
	}
}
