package com.dstgroup.fds.application.usecase;

import java.time.Clock;
import java.time.Instant;

import com.dstgroup.fds.application.dto.AbrirTicketCommand;
import com.dstgroup.fds.application.dto.AbrirTicketResponse;
import com.dstgroup.fds.application.port.out.FornecedorRepositoryPort;
import com.dstgroup.fds.application.port.out.MetricasPort;
import com.dstgroup.fds.application.port.out.NotificadorPort;
import com.dstgroup.fds.application.port.out.TicketFDSRepositoryPort;
import com.dstgroup.fds.domain.fds.FDSId;
import com.dstgroup.fds.domain.fornecedor.Fornecedor;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;
import com.dstgroup.fds.domain.fornecedor.FornecedorNaoEncontradoException;
import com.dstgroup.fds.domain.ticket.TicketFDS;

/**
 * Caso de uso: abrir um ticket de pedido de FDS a um fornecedor (RF07 —
 * botão "Novo Ticket" do protótipo).
 *
 * <p>Orquestra através de duas bounded contexts diferentes (Ticket e
 * Fornecedor) — típico da camada de Application, que coordena agregados,
 * ao contrário do domínio, que nunca vê mais do que um agregado de cada
 * vez.</p>
 *
 * <p>Ordem deliberada: valida o fornecedor primeiro (falha cedo, sem criar
 * nada); depois persiste o ticket; só depois tenta notificar. Se a
 * notificação falhar (ex.: SMTP em baixo), o ticket já persistido não é
 * desfeito — o facto de negócio "foi aberto um pedido" mantém-se válido
 * mesmo que o e-mail falhe transitoriamente. A métrica {@code tickets.abertos}
 * (Fase 5, Parte 4) é incrementada logo a seguir a persistir, pela mesma
 * razão — reflete o facto de negócio, não se a notificação teve sucesso.</p>
 */
public class AbrirTicketUseCase {

	private final TicketFDSRepositoryPort repositorio;
	private final FornecedorRepositoryPort fornecedorRepositorio;
	private final NotificadorPort notificador;
	private final Clock relogio;
	private final MetricasPort metricas;

	public AbrirTicketUseCase(TicketFDSRepositoryPort repositorio, FornecedorRepositoryPort fornecedorRepositorio,
			NotificadorPort notificador, Clock relogio, MetricasPort metricas) {
		this.repositorio = repositorio;
		this.fornecedorRepositorio = fornecedorRepositorio;
		this.notificador = notificador;
		this.relogio = relogio;
		this.metricas = metricas;
	}

	public AbrirTicketResponse executar(AbrirTicketCommand comando) {
		FornecedorId fornecedorId = FornecedorId.de(comando.fornecedorId());
		Fornecedor fornecedor = fornecedorRepositorio.obterPorId(fornecedorId)
				.orElseThrow(() -> new FornecedorNaoEncontradoException(fornecedorId));

		FDSId fdsId = comando.fdsId() == null ? null : FDSId.de(comando.fdsId());
		Instant agora = Instant.now(relogio);

		TicketFDS ticket = TicketFDS.abrir(fdsId, fornecedorId, agora);
		if (comando.mensagemInicial() != null && !comando.mensagemInicial().isBlank()) {
			ticket.adicionarMensagem(comando.autorMensagemInicial(), comando.mensagemInicial(), agora);
		}

		repositorio.guardar(ticket);
		metricas.incrementarTicketsAbertos();

		notificador.enviar(
				fornecedor.emailPrincipal().valor(),
				"Pedido de Ficha de Dados de Segurança",
				comando.mensagemInicial() != null && !comando.mensagemInicial().isBlank()
						? comando.mensagemInicial()
						: "Foi aberto um novo pedido de Ficha de Dados de Segurança."
		);

		return new AbrirTicketResponse(ticket.id().toString());
	}
}
