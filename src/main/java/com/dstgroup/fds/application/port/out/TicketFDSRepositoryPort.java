package com.dstgroup.fds.application.port.out;

import java.util.List;
import java.util.Optional;

import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.domain.ticket.TicketFDS;
import com.dstgroup.fds.domain.ticket.TicketFDSId;

public interface TicketFDSRepositoryPort {

	void guardar(TicketFDS ticket);

	Optional<TicketFDS> obterPorId(TicketFDSId id);

	Pagina<TicketFDS> listar(int pagina, int tamanho);

	/**
	 * @return todos os tickets em estado {@code ABERTO}, sem paginação —
	 * candidatos ao alerta de "sem resposta" (RF09), tal como
	 * {@code FDSRepositoryPort#listarCandidatasAObsolescencia} é para FDS.
	 */
	List<TicketFDS> listarAbertos();
}
