package com.dstgroup.fds.application.usecase;

import com.dstgroup.fds.application.ObraMapper;
import com.dstgroup.fds.application.dto.ObraResponse;
import com.dstgroup.fds.application.port.out.ObraRepositoryPort;
import com.dstgroup.fds.domain.obra.Obra;
import com.dstgroup.fds.domain.obra.ObraId;
import com.dstgroup.fds.domain.obra.ObraNaoEncontradaException;

public class ObterObraUseCase {

	private final ObraRepositoryPort repositorio;

	public ObterObraUseCase(ObraRepositoryPort repositorio) {
		this.repositorio = repositorio;
	}

	public ObraResponse executar(String id) {
		ObraId obraId = ObraId.de(id);
		Obra obra = repositorio.obterPorId(obraId)
				.orElseThrow(() -> new ObraNaoEncontradaException(obraId));
		return ObraMapper.paraResponse(obra);
	}
}
