package com.dstgroup.fds.domain.fds;

import com.dstgroup.fds.domain.shared.DomainException;

/**
 * Lançada quando o nome do produto químico é nulo ou está em branco.
 */
public class NomeProdutoQuimicoInvalidoException extends DomainException {

	public NomeProdutoQuimicoInvalidoException() {
		super("O nome do produto químico é obrigatório.");
	}
}
