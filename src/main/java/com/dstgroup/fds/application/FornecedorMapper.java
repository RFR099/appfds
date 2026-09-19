package com.dstgroup.fds.application;

import com.dstgroup.fds.application.dto.FornecedorResponse;
import com.dstgroup.fds.application.dto.FornecedorResumoResponse;
import com.dstgroup.fds.domain.fornecedor.Fornecedor;

/**
 * Converte o agregado {@link Fornecedor} para os DTOs de saída da
 * Application. O domínio nunca conhece este mapper.
 */
public final class FornecedorMapper {

	private FornecedorMapper() {
	}

	public static FornecedorResponse paraResponse(Fornecedor fornecedor) {
		return new FornecedorResponse(
				fornecedor.id().toString(),
				fornecedor.nome().valor(),
				fornecedor.emailPrincipal().valor(),
				fornecedor.contactos()
		);
	}

	public static FornecedorResumoResponse paraResumo(Fornecedor fornecedor) {
		return new FornecedorResumoResponse(fornecedor.id().toString(), fornecedor.nome().valor());
	}
}
