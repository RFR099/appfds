package com.dstgroup.fds.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.dto.TicketFDSResponse;
import com.dstgroup.fds.application.port.out.TicketFDSRepositoryPort;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;
import com.dstgroup.fds.domain.ticket.TicketFDS;
import com.dstgroup.fds.domain.ticket.TicketFDSId;
import com.dstgroup.fds.domain.ticket.TicketFDSNaoEncontradoException;

class ObterTicketUseCaseTest {

	@Test
	void deveDevolverTicketExistentePorId() {
		TicketFDS ticket = TicketFDS.abrir(null, FornecedorId.gerar(), Instant.parse("2026-06-01T10:00:00Z"));
		ticket.adicionarMensagem("gestor@dstgroup.pt", "Por favor enviem a FDS.", Instant.parse("2026-06-01T10:05:00Z"));
		TicketRepositorioFalso repositorio = new TicketRepositorioFalso();
		repositorio.porId.put(ticket.id(), ticket);
		ObterTicketUseCase useCase = new ObterTicketUseCase(repositorio);

		TicketFDSResponse resposta = useCase.executar(ticket.id().toString());

		assertThat(resposta.id()).isEqualTo(ticket.id().toString());
		assertThat(resposta.estado()).isEqualTo("ABERTO");
		assertThat(resposta.mensagens()).hasSize(1);
		assertThat(resposta.mensagens().get(0).autor()).isEqualTo("gestor@dstgroup.pt");
	}

	@Test
	void deveLancarExcecaoDeNaoEncontradoSeIdInexistente() {
		TicketRepositorioFalso repositorio = new TicketRepositorioFalso();
		ObterTicketUseCase useCase = new ObterTicketUseCase(repositorio);
		String idInexistente = UUID.randomUUID().toString();

		assertThatThrownBy(() -> useCase.executar(idInexistente))
				.isInstanceOf(TicketFDSNaoEncontradoException.class)
				.hasMessageContaining(idInexistente);
	}

	private static class TicketRepositorioFalso implements TicketFDSRepositoryPort {
		private final Map<TicketFDSId, TicketFDS> porId = new HashMap<>();

		@Override
		public void guardar(TicketFDS ticket) {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}

		@Override
		public Optional<TicketFDS> obterPorId(TicketFDSId id) {
			return Optional.ofNullable(porId.get(id));
		}

		@Override
		public Pagina<TicketFDS> listar(int pagina, int tamanho) {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}

		@Override
		public java.util.List<TicketFDS> listarAbertos() {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}
	}
}
