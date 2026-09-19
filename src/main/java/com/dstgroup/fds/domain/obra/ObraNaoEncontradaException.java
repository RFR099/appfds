package com.dstgroup.fds.domain.obra;

import com.dstgroup.fds.domain.shared.DomainException;

public class ObraNaoEncontradaException extends DomainException {

	public ObraNaoEncontradaException(ObraId id) {
		super("Não foi encontrada nenhuma obra com o id '" + id + "'.");
	}
}
