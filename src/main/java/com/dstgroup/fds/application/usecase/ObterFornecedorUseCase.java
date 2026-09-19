package com.dstgroup.fds.application.usecase;

import com.dstgroup.fds.application.FornecedorMapper;
import com.dstgroup.fds.application.dto.FornecedorResponse;
import com.dstgroup.fds.application.port.out.FornecedorRepositoryPort;
import com.dstgroup.fds.domain.fornecedor.Fornecedor;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;
import com.dstgroup.fds.domain.fornecedor.FornecedorNaoEncontradoException;

public class ObterFornecedorUseCase {

	private final FornecedorRepositoryPort repositorio;

	public ObterFornecedorUseCase(FornecedorRepositoryPort repositorio) {
		this.repositorio = repositorio;
	}

	public FornecedorResponse executar(String id) {
		FornecedorId fornecedorId = FornecedorId.de(id);
		Fornecedor fornecedor = repositorio.obterPorId(fornecedorId)
				.orElseThrow(() -> new FornecedorNaoEncontradoException(fornecedorId));
		return FornecedorMapper.paraResponse(fornecedor);
	}
}
