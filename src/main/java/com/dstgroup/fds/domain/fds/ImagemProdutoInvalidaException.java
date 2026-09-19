package com.dstgroup.fds.domain.fds;

import com.dstgroup.fds.domain.shared.DomainException;

/**
 * Lançada quando os metadados de uma {@link ImagemProduto} não são válidos:
 * caminho vazio, tipo MIME não suportado, ou tamanho fora dos limites.
 */
public class ImagemProdutoInvalidaException extends DomainException {

	public ImagemProdutoInvalidaException(String mensagem) {
		super(mensagem);
	}
}
