package com.dstgroup.fds.infrastructure.persistence;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Repository;

import com.dstgroup.fds.application.dto.FiltroFDS;
import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.port.out.FDSRepositoryPort;
import com.dstgroup.fds.domain.fds.FDSId;
import com.dstgroup.fds.domain.fds.FichaDadosSeguranca;
import com.dstgroup.fds.domain.fds.Marca;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;

/**
 * Adapter de saída (Onion): implementação real do {@link FDSRepositoryPort}
 * com Spring Data JPA + PostgreSQL. É o único ponto do sistema que sabe que a
 * persistência é feita em SQL — trocar de base de dados no futuro significa
 * substituir esta classe, sem tocar em domain/application.
 */
@Repository
class FDSRepositoryAdapter implements FDSRepositoryPort {

	private final FDSJpaRepository jpaRepository;

	FDSRepositoryAdapter(FDSJpaRepository jpaRepository) {
		this.jpaRepository = jpaRepository;
	}

	@Override
	public boolean existeDuplicado(String nomeProdutoQuimico, Marca marca, FornecedorId fornecedorId) {
		return jpaRepository.existsByNomeProdutoQuimicoIgnoreCaseAndMarcaIgnoreCaseAndFornecedorId(
				nomeProdutoQuimico, marca.nome(), fornecedorId.valor());
	}

	@Override
	public void guardar(FichaDadosSeguranca fds) {
		jpaRepository.save(FDSEntityMapper.paraEntidade(fds));
	}

	@Override
	public Optional<FichaDadosSeguranca> obterPorId(FDSId id) {
		return jpaRepository.findById(id.valor()).map(FDSEntityMapper::paraDominio);
	}

	@Override
	public Pagina<FichaDadosSeguranca> listar(FiltroFDS filtro, int pagina, int tamanho) {
		Specification<FDSJpaEntity> specification = FDSSpecifications.comFiltro(filtro);
		Page<FDSJpaEntity> paginaJpa = jpaRepository.findAll(specification, PageRequest.of(pagina, tamanho));
		List<FichaDadosSeguranca> conteudo = paginaJpa.getContent().stream()
				.map(FDSEntityMapper::paraDominio)
				.toList();
		return new Pagina<>(conteudo, pagina, tamanho, paginaJpa.getTotalElements());
	}

	@Override
	public List<FichaDadosSeguranca> listarCandidatasAObsolescencia() {
		return jpaRepository.findAll(FDSSpecifications.candidatasAObsolescencia()).stream()
				.map(FDSEntityMapper::paraDominio)
				.toList();
	}
}
