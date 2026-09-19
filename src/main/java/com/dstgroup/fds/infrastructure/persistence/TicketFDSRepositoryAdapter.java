package com.dstgroup.fds.infrastructure.persistence;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;

import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.port.out.TicketFDSRepositoryPort;
import com.dstgroup.fds.domain.ticket.EstadoTicket;
import com.dstgroup.fds.domain.ticket.TicketFDS;
import com.dstgroup.fds.domain.ticket.TicketFDSId;

@Repository
class TicketFDSRepositoryAdapter implements TicketFDSRepositoryPort {

	private final TicketFDSJpaRepository jpaRepository;

	TicketFDSRepositoryAdapter(TicketFDSJpaRepository jpaRepository) {
		this.jpaRepository = jpaRepository;
	}

	@Override
	public void guardar(TicketFDS ticket) {
		jpaRepository.save(TicketFDSEntityMapper.paraEntidade(ticket));
	}

	@Override
	public Optional<TicketFDS> obterPorId(TicketFDSId id) {
		return jpaRepository.findById(id.valor()).map(TicketFDSEntityMapper::paraDominio);
	}

	@Override
	public Pagina<TicketFDS> listar(int pagina, int tamanho) {
		Page<TicketFDSJpaEntity> paginaJpa = jpaRepository.findAll(PageRequest.of(pagina, tamanho));
		List<TicketFDS> conteudo = paginaJpa.getContent().stream()
				.map(TicketFDSEntityMapper::paraDominio)
				.toList();
		return new Pagina<>(conteudo, pagina, tamanho, paginaJpa.getTotalElements());
	}

	@Override
	public List<TicketFDS> listarAbertos() {
		return jpaRepository.findByEstado(EstadoTicket.ABERTO).stream()
				.map(TicketFDSEntityMapper::paraDominio)
				.toList();
	}
}
