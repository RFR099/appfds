package com.dstgroup.fds.infrastructure.persistence;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.dstgroup.fds.domain.ticket.EstadoTicket;

interface TicketFDSJpaRepository extends JpaRepository<TicketFDSJpaEntity, UUID> {

	List<TicketFDSJpaEntity> findByEstado(EstadoTicket estado);
}
