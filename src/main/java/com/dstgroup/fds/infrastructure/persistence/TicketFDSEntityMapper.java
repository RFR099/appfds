package com.dstgroup.fds.infrastructure.persistence;

import java.util.List;

import com.dstgroup.fds.domain.fds.FDSId;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;
import com.dstgroup.fds.domain.ticket.MensagemTicket;
import com.dstgroup.fds.domain.ticket.TicketFDS;
import com.dstgroup.fds.domain.ticket.TicketFDSId;

final class TicketFDSEntityMapper {

	private TicketFDSEntityMapper() {
	}

	static TicketFDSJpaEntity paraEntidade(TicketFDS ticket) {
		List<MensagemTicketEmbeddable> mensagens = ticket.mensagens().stream()
				.map(m -> new MensagemTicketEmbeddable(m.autor(), m.texto(), m.dataEnvio()))
				.toList();
		return new TicketFDSJpaEntity(
				ticket.id().valor(),
				ticket.fdsId() == null ? null : ticket.fdsId().valor(),
				ticket.fornecedorId().valor(),
				ticket.estado(),
				ticket.dataAbertura(),
				mensagens
		);
	}

	static TicketFDS paraDominio(TicketFDSJpaEntity entidade) {
		List<MensagemTicket> mensagens = entidade.getMensagens().stream()
				.map(m -> new MensagemTicket(m.getAutor(), m.getTexto(), m.getDataEnvio()))
				.toList();
		return TicketFDS.reidratar(
				new TicketFDSId(entidade.getId()),
				entidade.getFdsId() == null ? null : new FDSId(entidade.getFdsId()),
				new FornecedorId(entidade.getFornecedorId()),
				entidade.getEstado(),
				entidade.getDataAbertura(),
				mensagens
		);
	}
}
