package com.dstgroup.fds.application;

import com.dstgroup.fds.application.dto.RegistoAuditoriaResponse;
import com.dstgroup.fds.domain.auditoria.RegistoAuditoriaFDS;

/**
 * Converte {@link RegistoAuditoriaFDS} para o DTO de saída da Application. O
 * domínio nunca conhece este mapper.
 */
public final class AuditoriaMapper {

	private AuditoriaMapper() {
	}

	public static RegistoAuditoriaResponse paraResponse(RegistoAuditoriaFDS registo) {
		return new RegistoAuditoriaResponse(
				registo.estadoAnterior().name(),
				registo.estadoNovo().name(),
				registo.ocorridoEm().toString(),
				registo.utilizador()
		);
	}
}
