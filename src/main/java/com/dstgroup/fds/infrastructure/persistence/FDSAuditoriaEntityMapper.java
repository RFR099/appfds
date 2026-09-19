package com.dstgroup.fds.infrastructure.persistence;

import java.util.UUID;

import com.dstgroup.fds.domain.auditoria.RegistoAuditoriaFDS;
import com.dstgroup.fds.domain.fds.EstadoFDS;
import com.dstgroup.fds.domain.fds.FDSId;

final class FDSAuditoriaEntityMapper {

	private FDSAuditoriaEntityMapper() {
	}

	static FDSAuditoriaJpaEntity paraEntidade(RegistoAuditoriaFDS registo) {
		return new FDSAuditoriaJpaEntity(
				UUID.randomUUID(),
				registo.fdsId().valor(),
				registo.estadoAnterior().name(),
				registo.estadoNovo().name(),
				registo.ocorridoEm(),
				registo.utilizador()
		);
	}

	static RegistoAuditoriaFDS paraDominio(FDSAuditoriaJpaEntity entidade) {
		return new RegistoAuditoriaFDS(
				new FDSId(entidade.getFdsId()),
				EstadoFDS.valueOf(entidade.getEstadoAnterior()),
				EstadoFDS.valueOf(entidade.getEstadoNovo()),
				entidade.getOcorridoEm(),
				entidade.getUtilizador()
		);
	}
}
