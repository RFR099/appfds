package com.dstgroup.fds.infrastructure.persistence;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;

import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.port.out.CentroProdutivoRepositoryPort;
import com.dstgroup.fds.domain.obra.CentroProdutivo;
import com.dstgroup.fds.domain.obra.CentroProdutivoId;

@Repository
class CentroProdutivoRepositoryAdapter implements CentroProdutivoRepositoryPort {

	private final CentroProdutivoJpaRepository jpaRepository;

	CentroProdutivoRepositoryAdapter(CentroProdutivoJpaRepository jpaRepository) {
		this.jpaRepository = jpaRepository;
	}

	@Override
	public void guardar(CentroProdutivo centro) {
		jpaRepository.save(CentroProdutivoEntityMapper.paraEntidade(centro));
	}

	@Override
	public Optional<CentroProdutivo> obterPorId(CentroProdutivoId id) {
		return jpaRepository.findById(id.valor()).map(CentroProdutivoEntityMapper::paraDominio);
	}

	@Override
	public Pagina<CentroProdutivo> listar(int pagina, int tamanho) {
		Page<CentroProdutivoJpaEntity> paginaJpa = jpaRepository.findAll(PageRequest.of(pagina, tamanho));
		List<CentroProdutivo> conteudo = paginaJpa.getContent().stream()
				.map(CentroProdutivoEntityMapper::paraDominio)
				.toList();
		return new Pagina<>(conteudo, pagina, tamanho, paginaJpa.getTotalElements());
	}
}
