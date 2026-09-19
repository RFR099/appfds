package com.dstgroup.fds.domain.obra;

import com.dstgroup.fds.domain.shared.DomainException;

public class NomeObraInvalidoException extends DomainException {

	public NomeObraInvalidoException() {
		super("O nome da obra não pode ser vazio ou nulo.");
	}
}
