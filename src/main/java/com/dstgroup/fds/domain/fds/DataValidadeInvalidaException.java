package com.dstgroup.fds.domain.fds;

import com.dstgroup.fds.domain.shared.DomainException;

/**
 * Lançada quando a Data de Validade é nula, quando a Data de Revisão é nula,
 * ou quando a Data de Validade não é estritamente posterior à Data de Revisão.
 */
public class DataValidadeInvalidaException extends DomainException {

	public DataValidadeInvalidaException(String mensagem) {
		super(mensagem);
	}
}
