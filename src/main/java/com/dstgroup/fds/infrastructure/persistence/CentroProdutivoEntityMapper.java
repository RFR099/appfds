package com.dstgroup.fds.infrastructure.persistence;

import com.dstgroup.fds.domain.obra.CentroProdutivo;
import com.dstgroup.fds.domain.obra.CentroProdutivoId;

final class CentroProdutivoEntityMapper {

	private CentroProdutivoEntityMapper() {
	}

	static CentroProdutivoJpaEntity paraEntidade(CentroProdutivo centro) {
		return new CentroProdutivoJpaEntity(centro.id().valor(), centro.nome(), centro.localizacao());
	}

	static CentroProdutivo paraDominio(CentroProdutivoJpaEntity entidade) {
		return CentroProdutivo.reidratar(
				new CentroProdutivoId(entidade.getId()), entidade.getNome(), entidade.getLocalizacao()
		);
	}
}
