package com.dstgroup.fds.infrastructure.persistence;

import com.dstgroup.fds.domain.fornecedor.Fornecedor;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;
import com.dstgroup.fds.domain.fornecedor.NomeFornecedor;
import com.dstgroup.fds.domain.shared.Email;

final class FornecedorEntityMapper {

	private FornecedorEntityMapper() {
	}

	static FornecedorJpaEntity paraEntidade(Fornecedor fornecedor) {
		return new FornecedorJpaEntity(
				fornecedor.id().valor(),
				fornecedor.nome().valor(),
				fornecedor.emailPrincipal().valor(),
				fornecedor.contactos()
		);
	}

	static Fornecedor paraDominio(FornecedorJpaEntity entidade) {
		return Fornecedor.reidratar(
				new FornecedorId(entidade.getId()),
				new NomeFornecedor(entidade.getNome()),
				new Email(entidade.getEmailPrincipal()),
				entidade.getContactos()
		);
	}
}
