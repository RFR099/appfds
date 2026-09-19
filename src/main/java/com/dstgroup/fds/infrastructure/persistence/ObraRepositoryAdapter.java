package com.dstgroup.fds.infrastructure.persistence;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;

import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.port.out.ObraRepositoryPort;
import com.dstgroup.fds.domain.obra.Obra;
import com.dstgroup.fds.domain.obra.ObraId;

@Repository
class ObraRepositoryAdapter implements ObraRepositoryPort {

	private final ObraJpaRepository jpaRepository;

	ObraRepositoryAdapter(ObraJpaRepository jpaRepository) {
		this.jpaRepository = jpaRepository;
	}

	@Override
	public void guardar(Obra obra) {
		jpaRepository.save(ObraEntityMapper.paraEntidade(obra));
	}

	@Override
	public Optional<Obra> obterPorId(ObraId id) {
		return jpaRepository.findById(id.valor()).map(ObraEntityMapper::paraDominio);
	}

	@Override
	public Pagina<Obra> listar(int pagina, int tamanho) {
		Page<ObraJpaEntity> paginaJpa = jpaRepository.findAll(PageRequest.of(pagina, tamanho));
		List<Obra> conteudo = paginaJpa.getContent().stream()
				.map(ObraEntityMapper::paraDominio)
				.toList();
		return new Pagina<>(conteudo, pagina, tamanho, paginaJpa.getTotalElements());
	}
}
