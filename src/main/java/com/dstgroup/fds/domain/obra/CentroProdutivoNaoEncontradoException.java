package com.dstgroup.fds.domain.obra;

import com.dstgroup.fds.domain.shared.DomainException;

public class CentroProdutivoNaoEncontradoException extends DomainException {

	public CentroProdutivoNaoEncontradoException(CentroProdutivoId id) {
		super("Não foi encontrado nenhum centro produtivo com o id '" + id + "'.");
	}
}
