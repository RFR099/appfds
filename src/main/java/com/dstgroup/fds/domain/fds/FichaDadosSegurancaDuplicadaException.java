package com.dstgroup.fds.domain.fds;

import com.dstgroup.fds.domain.shared.DomainException;

/**
 * Lançada quando se tenta criar uma FDS para um Nome de produto + Marca +
 * Fornecedor que já tem uma FDS ativa (RF15 — impedir duplicação).
 */
public class FichaDadosSegurancaDuplicadaException extends DomainException {

	public FichaDadosSegurancaDuplicadaException(String nomeProdutoQuimico, Marca marca) {
		super("Já existe uma FDS para o produto '" + nomeProdutoQuimico + "' da marca '"
				+ marca.nome() + "' com este fornecedor.");
	}
}
