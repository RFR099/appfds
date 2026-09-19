package com.dstgroup.fds.domain.fds;

import com.dstgroup.fds.domain.shared.DomainException;

/**
 * Lançada quando se tenta transicionar uma FDS para fora do estado
 * {@link EstadoFDS#RASCUNHO} sem que os campos obrigatórios (Fornecedor,
 * Data de Validade, pelo menos um Pictograma de Perigo) estejam preenchidos.
 */
public class FichaDadosSegurancaIncompletaException extends DomainException {

	public FichaDadosSegurancaIncompletaException(String mensagem) {
		super(mensagem);
	}
}
