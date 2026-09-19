package com.dstgroup.fds.application;

import com.dstgroup.fds.application.dto.CentroProdutivoResponse;
import com.dstgroup.fds.application.dto.CentroProdutivoResumoResponse;
import com.dstgroup.fds.domain.obra.CentroProdutivo;

public final class CentroProdutivoMapper {

	private CentroProdutivoMapper() {
	}

	public static CentroProdutivoResponse paraResponse(CentroProdutivo centro) {
		return new CentroProdutivoResponse(centro.id().toString(), centro.nome(), centro.localizacao());
	}

	public static CentroProdutivoResumoResponse paraResumo(CentroProdutivo centro) {
		return new CentroProdutivoResumoResponse(centro.id().toString(), centro.nome());
	}
}
