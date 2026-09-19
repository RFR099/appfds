package com.dstgroup.fds.application.usecase;

import com.dstgroup.fds.application.dto.CriarObraCommand;
import com.dstgroup.fds.application.dto.CriarObraResponse;
import com.dstgroup.fds.application.port.out.ObraRepositoryPort;
import com.dstgroup.fds.domain.obra.CentroProdutivoId;
import com.dstgroup.fds.domain.obra.Obra;

public class CriarObraUseCase {

	private final ObraRepositoryPort repositorio;

	public CriarObraUseCase(ObraRepositoryPort repositorio) {
		this.repositorio = repositorio;
	}

	public CriarObraResponse executar(CriarObraCommand comando) {
		CentroProdutivoId centroProdutivoId = CentroProdutivoId.de(comando.centroProdutivoId());
		Obra obra = Obra.criar(comando.nome(), centroProdutivoId);
		repositorio.guardar(obra);
		return new CriarObraResponse(obra.id().toString());
	}
}
