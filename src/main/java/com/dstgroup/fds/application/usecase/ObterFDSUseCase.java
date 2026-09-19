package com.dstgroup.fds.application.usecase;

import com.dstgroup.fds.application.FDSMapper;
import com.dstgroup.fds.application.dto.FDSResponse;
import com.dstgroup.fds.application.port.out.FDSRepositoryPort;
import com.dstgroup.fds.domain.fds.FDSId;
import com.dstgroup.fds.domain.fds.FDSNaoEncontradaException;
import com.dstgroup.fds.domain.fds.FichaDadosSeguranca;

/**
 * Caso de uso: obter os detalhes de uma FDS por id (ex.: {@code GET /fds/{id}}).
 */
public class ObterFDSUseCase {

	private final FDSRepositoryPort repositorio;

	public ObterFDSUseCase(FDSRepositoryPort repositorio) {
		this.repositorio = repositorio;
	}

	public FDSResponse executar(String id) {
		FDSId fdsId = FDSId.de(id);
		FichaDadosSeguranca fds = repositorio.obterPorId(fdsId)
				.orElseThrow(() -> new FDSNaoEncontradaException(fdsId));
		return FDSMapper.paraResponse(fds);
	}
}
