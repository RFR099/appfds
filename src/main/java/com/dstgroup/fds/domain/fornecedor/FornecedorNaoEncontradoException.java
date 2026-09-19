package com.dstgroup.fds.domain.fornecedor;

import com.dstgroup.fds.domain.shared.DomainException;

/**
 * Lançada quando se pede um fornecedor por um {@link FornecedorId} que não
 * existe. Traduzida pela presentation layer para um {@code 404 Not Found}.
 */
public class FornecedorNaoEncontradoException extends DomainException {

	public FornecedorNaoEncontradoException(FornecedorId id) {
		super("Não foi encontrado nenhum fornecedor com o id '" + id + "'.");
	}
}
