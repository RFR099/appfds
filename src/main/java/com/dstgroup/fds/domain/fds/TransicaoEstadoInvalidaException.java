package com.dstgroup.fds.domain.fds;

import com.dstgroup.fds.domain.shared.DomainException;

/**
 * Lançada quando se tenta transicionar uma {@link EstadoFDS} para um estado
 * que a máquina de estados não permite a partir do estado atual.
 */
public class TransicaoEstadoInvalidaException extends DomainException {

	public TransicaoEstadoInvalidaException(EstadoFDS origem, EstadoFDS destino) {
		super("Transição de estado inválida: " + origem + " -> " + destino);
	}
}
