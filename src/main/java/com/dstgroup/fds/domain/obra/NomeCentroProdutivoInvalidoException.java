package com.dstgroup.fds.domain.obra;

import com.dstgroup.fds.domain.shared.DomainException;

public class NomeCentroProdutivoInvalidoException extends DomainException {

	public NomeCentroProdutivoInvalidoException() {
		super("O nome do centro produtivo não pode ser vazio ou nulo.");
	}
}
