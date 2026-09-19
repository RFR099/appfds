package com.dstgroup.fds.infrastructure.persistence;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;

import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.port.out.FornecedorRepositoryPort;
import com.dstgroup.fds.domain.fornecedor.Fornecedor;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;

@Repository
class FornecedorRepositoryAdapter implements FornecedorRepositoryPort {

	private final FornecedorJpaRepository jpaRepository;

	FornecedorRepositoryAdapter(FornecedorJpaRepository jpaRepository) {
		this.jpaRepository = jpaRepository;
	}

	@Override
	public void guardar(Fornecedor fornecedor) {
		jpaRepository.save(FornecedorEntityMapper.paraEntidade(fornecedor));
	}

	@Override
	public Optional<Fornecedor> obterPorId(FornecedorId id) {
		return jpaRepository.findById(id.valor()).map(FornecedorEntityMapper::paraDominio);
	}

	@Override
	public Pagina<Fornecedor> listar(int pagina, int tamanho) {
		Page<FornecedorJpaEntity> paginaJpa = jpaRepository.findAll(PageRequest.of(pagina, tamanho));
		List<Fornecedor> conteudo = paginaJpa.getContent().stream()
				.map(FornecedorEntityMapper::paraDominio)
				.toList();
		return new Pagina<>(conteudo, pagina, tamanho, paginaJpa.getTotalElements());
	}
}
