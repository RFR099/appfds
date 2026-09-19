package com.dstgroup.fds.application.usecase;

import com.dstgroup.fds.application.dto.CriarCentroProdutivoCommand;
import com.dstgroup.fds.application.dto.CriarCentroProdutivoResponse;
import com.dstgroup.fds.application.port.out.CentroProdutivoRepositoryPort;
import com.dstgroup.fds.domain.obra.CentroProdutivo;

public class CriarCentroProdutivoUseCase {

	private final CentroProdutivoRepositoryPort repositorio;

	public CriarCentroProdutivoUseCase(CentroProdutivoRepositoryPort repositorio) {
		this.repositorio = repositorio;
	}

	public CriarCentroProdutivoResponse executar(CriarCentroProdutivoCommand comando) {
		CentroProdutivo centro = CentroProdutivo.criar(comando.nome(), comando.localizacao());
		repositorio.guardar(centro);
		return new CriarCentroProdutivoResponse(centro.id().toString());
	}
}
