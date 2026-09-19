package com.dstgroup.fds.domain.ticket;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.dstgroup.fds.domain.fds.FDSId;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;

class TicketFDSTest {

	private static final Instant ABERTURA = Instant.parse("2026-06-01T10:00:00Z");

	@Test
	void deveAbrirTicketParaFDSExistente() {
		FDSId fdsId = FDSId.gerar();
		FornecedorId fornecedorId = FornecedorId.gerar();

		TicketFDS ticket = TicketFDS.abrir(fdsId, fornecedorId, ABERTURA);

		assertThat(ticket.fdsId()).isEqualTo(fdsId);
		assertThat(ticket.fornecedorId()).isEqualTo(fornecedorId);
		assertThat(ticket.estado()).isEqualTo(EstadoTicket.ABERTO);
		assertThat(ticket.dataAbertura()).isEqualTo(ABERTURA);
		assertThat(ticket.mensagens()).isEmpty();
	}

	@Test
	void deveAbrirTicketParaPedidoDeFDSNova() {
		// fdsId nulo representa um pedido de FDS que ainda não existe no catálogo
		TicketFDS ticket = TicketFDS.abrir(null, FornecedorId.gerar(), ABERTURA);

		assertThat(ticket.fdsId()).isNull();
	}

	@Test
	void deveRejeitarFornecedorNulo() {
		assertThatThrownBy(() -> TicketFDS.abrir(FDSId.gerar(), null, ABERTURA))
				.isInstanceOf(NullPointerException.class);
	}

	@Test
	void deveGerarIdUnicoParaCadaTicketAberto() {
		TicketFDS a = TicketFDS.abrir(null, FornecedorId.gerar(), ABERTURA);
		TicketFDS b = TicketFDS.abrir(null, FornecedorId.gerar(), ABERTURA);

		assertThat(a.id()).isNotEqualTo(b.id());
	}

	@Test
	void doisTicketsDiferentesNuncaSaoIguaisMesmoComOsMesmosDados() {
		FornecedorId fornecedorId = FornecedorId.gerar();
		TicketFDS a = TicketFDS.abrir(null, fornecedorId, ABERTURA);
		TicketFDS b = TicketFDS.abrir(null, fornecedorId, ABERTURA);

		assertThat(a).isNotEqualTo(b);
	}

	@Test
	void umTicketEIgualASiProprio() {
		TicketFDS ticket = TicketFDS.abrir(null, FornecedorId.gerar(), ABERTURA);

		assertThat(ticket).isEqualTo(ticket);
	}

	@Test
	void deveAdicionarMensagem() {
		TicketFDS ticket = TicketFDS.abrir(null, FornecedorId.gerar(), ABERTURA);

		ticket.adicionarMensagem("gestor@dstgroup.pt", "Podem enviar a FDS atualizada?", ABERTURA.plusSeconds(60));

		assertThat(ticket.mensagens()).hasSize(1);
		assertThat(ticket.mensagens().get(0).autor()).isEqualTo("gestor@dstgroup.pt");
	}

	@Test
	void deveManterAOrdemDasMensagens() {
		TicketFDS ticket = TicketFDS.abrir(null, FornecedorId.gerar(), ABERTURA);

		ticket.adicionarMensagem("gestor", "primeira", ABERTURA.plusSeconds(60));
		ticket.adicionarMensagem("fornecedor", "segunda", ABERTURA.plusSeconds(120));

		assertThat(ticket.mensagens()).extracting(MensagemTicket::texto)
				.containsExactly("primeira", "segunda");
	}

	@Test
	void deveMarcarComoRespondido() {
		TicketFDS ticket = TicketFDS.abrir(null, FornecedorId.gerar(), ABERTURA);

		ticket.marcarComoRespondido();

		assertThat(ticket.estado()).isEqualTo(EstadoTicket.RESPONDIDO);
	}

	@Test
	void deveFecharDeAberto() {
		TicketFDS ticket = TicketFDS.abrir(null, FornecedorId.gerar(), ABERTURA);

		ticket.fechar();

		assertThat(ticket.estado()).isEqualTo(EstadoTicket.FECHADO);
	}

	@Test
	void deveFecharDeRespondido() {
		TicketFDS ticket = TicketFDS.abrir(null, FornecedorId.gerar(), ABERTURA);
		ticket.marcarComoRespondido();

		ticket.fechar();

		assertThat(ticket.estado()).isEqualTo(EstadoTicket.FECHADO);
	}

	@Test
	void naoDeveMarcarComoRespondidoDepoisDeFechado() {
		TicketFDS ticket = TicketFDS.abrir(null, FornecedorId.gerar(), ABERTURA);
		ticket.fechar();

		assertThatThrownBy(ticket::marcarComoRespondido)
				.isInstanceOf(TransicaoEstadoTicketInvalidaException.class);
	}

	@Test
	void naoDeveAdicionarMensagemQuandoJaFechado() {
		TicketFDS ticket = TicketFDS.abrir(null, FornecedorId.gerar(), ABERTURA);
		ticket.fechar();

		assertThatThrownBy(() -> ticket.adicionarMensagem("autor", "texto", ABERTURA.plusSeconds(60)))
				.isInstanceOf(TicketFDSFechadoException.class);
	}

	@Test
	void deveReidratarPreservandoTudo() {
		TicketFDSId id = TicketFDSId.gerar();
		FDSId fdsId = FDSId.gerar();
		FornecedorId fornecedorId = FornecedorId.gerar();
		MensagemTicket mensagem = new MensagemTicket("autor", "texto", ABERTURA.plusSeconds(60));

		TicketFDS reidratado = TicketFDS.reidratar(id, fdsId, fornecedorId, EstadoTicket.RESPONDIDO,
				ABERTURA, List.of(mensagem));

		assertThat(reidratado.id()).isEqualTo(id);
		assertThat(reidratado.estado()).isEqualTo(EstadoTicket.RESPONDIDO);
		assertThat(reidratado.mensagens()).containsExactly(mensagem);
	}
}
