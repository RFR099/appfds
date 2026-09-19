package com.dstgroup.fds.domain.fds;

import com.dstgroup.fds.domain.shared.DomainException;

/**
 * Lançada quando se tenta editar campos de uma {@link FichaDadosSeguranca}
 * que já não está em {@link EstadoFDS#RASCUNHO}. Uma FDS finalizada
 * (Atualizada, Solicitada ao Fornecedor, Obsoleta) só muda de estado — nunca
 * de conteúdo diretamente.
 */
public class FichaDadosSegurancaNaoEditavelException extends DomainException {

	public FichaDadosSegurancaNaoEditavelException(EstadoFDS estadoAtual) {
		super("Não é possível editar uma FDS que já não está em RASCUNHO (estado atual: " + estadoAtual + ").");
	}
}
