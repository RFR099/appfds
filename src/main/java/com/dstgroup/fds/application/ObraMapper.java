package com.dstgroup.fds.application;

import com.dstgroup.fds.application.dto.ObraResponse;
import com.dstgroup.fds.application.dto.ObraResumoResponse;
import com.dstgroup.fds.domain.obra.Obra;

public final class ObraMapper {

	private ObraMapper() {
	}

	public static ObraResponse paraResponse(Obra obra) {
		return new ObraResponse(obra.id().toString(), obra.nome(), obra.centroProdutivoId().toString());
	}

	public static ObraResumoResponse paraResumo(Obra obra) {
		return new ObraResumoResponse(obra.id().toString(), obra.nome());
	}
}
