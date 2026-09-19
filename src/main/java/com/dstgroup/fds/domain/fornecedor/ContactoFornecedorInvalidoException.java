package com.dstgroup.fds.domain.fornecedor;

import com.dstgroup.fds.domain.shared.DomainException;

/**
 * Lançada quando se tenta adicionar um contacto nulo ou em branco a um
 * {@link Fornecedor}.
 */
public class ContactoFornecedorInvalidoException extends DomainException {

	public ContactoFornecedorInvalidoException() {
		super("O contacto não pode ser vazio ou nulo.");
	}
}
