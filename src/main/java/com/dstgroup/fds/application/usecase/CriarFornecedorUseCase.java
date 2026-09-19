package com.dstgroup.fds.application.usecase;

import com.dstgroup.fds.application.dto.CriarFornecedorCommand;
import com.dstgroup.fds.application.dto.CriarFornecedorResponse;
import com.dstgroup.fds.application.port.out.FornecedorRepositoryPort;
import com.dstgroup.fds.domain.fornecedor.Fornecedor;
import com.dstgroup.fds.domain.fornecedor.NomeFornecedor;
import com.dstgroup.fds.domain.shared.Email;

/**
 * Caso de uso: criar um fornecedor (ecrã dedicado ou "Adicionar Fornecedor"
 * inline no formulário de FDS — RF05).
 */
public class CriarFornecedorUseCase {

	private final FornecedorRepositoryPort repositorio;

	public CriarFornecedorUseCase(FornecedorRepositoryPort repositorio) {
		this.repositorio = repositorio;
	}

	public CriarFornecedorResponse executar(CriarFornecedorCommand comando) {
		Fornecedor fornecedor = Fornecedor.criar(
				new NomeFornecedor(comando.nome()),
				new Email(comando.email()),
				comando.contactos()
		);

		repositorio.guardar(fornecedor);

		return new CriarFornecedorResponse(fornecedor.id().toString());
	}
}
