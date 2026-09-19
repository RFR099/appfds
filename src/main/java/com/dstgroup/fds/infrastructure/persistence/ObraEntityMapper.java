package com.dstgroup.fds.infrastructure.persistence;

import com.dstgroup.fds.domain.obra.CentroProdutivoId;
import com.dstgroup.fds.domain.obra.Obra;
import com.dstgroup.fds.domain.obra.ObraId;

final class ObraEntityMapper {

	private ObraEntityMapper() {
	}

	static ObraJpaEntity paraEntidade(Obra obra) {
		return new ObraJpaEntity(obra.id().valor(), obra.nome(), obra.centroProdutivoId().valor());
	}

	static Obra paraDominio(ObraJpaEntity entidade) {
		return Obra.reidratar(
				new ObraId(entidade.getId()), entidade.getNome(), new CentroProdutivoId(entidade.getCentroProdutivoId())
		);
	}
}
