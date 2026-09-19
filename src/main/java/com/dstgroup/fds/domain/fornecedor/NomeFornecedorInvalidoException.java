package com.dstgroup.fds.domain.fornecedor;

import com.dstgroup.fds.domain.shared.DomainException;

/**
 * Lançada quando se tenta construir um {@link NomeFornecedor} com um valor
 * nulo, em branco, ou que excede o tamanho máximo permitido.
 */
public class NomeFornecedorInvalidoException extends DomainException {

	public NomeFornecedorInvalidoException(String mensagem) {
		super(mensagem);
	}
}
