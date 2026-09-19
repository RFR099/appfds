package com.dstgroup.fds.application.usecase;

import com.dstgroup.fds.application.CentroProdutivoMapper;
import com.dstgroup.fds.application.dto.CentroProdutivoResponse;
import com.dstgroup.fds.application.port.out.CentroProdutivoRepositoryPort;
import com.dstgroup.fds.domain.obra.CentroProdutivo;
import com.dstgroup.fds.domain.obra.CentroProdutivoId;
import com.dstgroup.fds.domain.obra.CentroProdutivoNaoEncontradoException;

public class ObterCentroProdutivoUseCase {

	private final CentroProdutivoRepositoryPort repositorio;

	public ObterCentroProdutivoUseCase(CentroProdutivoRepositoryPort repositorio) {
		this.repositorio = repositorio;
	}

	public CentroProdutivoResponse executar(String id) {
		CentroProdutivoId centroId = CentroProdutivoId.de(id);
		CentroProdutivo centro = repositorio.obterPorId(centroId)
				.orElseThrow(() -> new CentroProdutivoNaoEncontradoException(centroId));
		return CentroProdutivoMapper.paraResponse(centro);
	}
}
