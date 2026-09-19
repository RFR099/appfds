package com.dstgroup.fds.application.usecase;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

import com.dstgroup.fds.application.AlertaMapper;
import com.dstgroup.fds.application.dto.AlertaFDSResponse;
import com.dstgroup.fds.application.dto.AlertaTicketResponse;
import com.dstgroup.fds.application.dto.AlertasResponse;
import com.dstgroup.fds.application.port.out.FDSRepositoryPort;
import com.dstgroup.fds.application.port.out.TicketFDSRepositoryPort;
import com.dstgroup.fds.domain.fds.PoliticaValidadeFDS;
import com.dstgroup.fds.domain.ticket.PoliticaAlertaTicket;

/**
 * Caso de uso do "badge" de Alertas (RF09).
 *
 * <p>Ao contrário de Auditoria (Fase 4, Parte 5), que é inerentemente
 * histórica e por isso persistida a partir de Domain Events, os Alertas são
 * factos sobre o estado atual — recomputáveis e idempotentes a qualquer
 * momento a partir do que já está guardado (FDS e Tickets). Por isso esta
 * implementação calcula os alertas em runtime, no momento da consulta, em
 * vez de manter uma entidade de alerta persistida e atualizada por eventos
 * (o esboço original do {@code AlertaGeradoEvent} numa subdomínio de
 * "Notificações"). Isto evita a complexidade de suprimir alertas duplicados
 * e de reconciliar o estado persistido com a realidade, o que é preferível
 * para o MVP.</p>
 *
 * <p>Nunca chama {@code LocalDate.now()}/{@code Instant.now()} diretamente —
 * ambos derivam do {@link Clock} injetado, mantendo o caso de uso
 * determinístico e testável sem esperas reais.</p>
 */
public class ObterAlertasUseCase {

	private final FDSRepositoryPort fdsRepositorio;
	private final TicketFDSRepositoryPort ticketRepositorio;
	private final Clock relogio;
	private final int diasAntecedenciaFDS;
	private final int diasSemRespostaTicket;

	public ObterAlertasUseCase(FDSRepositoryPort fdsRepositorio, TicketFDSRepositoryPort ticketRepositorio,
			Clock relogio, int diasAntecedenciaFDS, int diasSemRespostaTicket) {
		this.fdsRepositorio = Objects.requireNonNull(fdsRepositorio, "O repositório de FDS não pode ser nulo.");
		this.ticketRepositorio = Objects.requireNonNull(ticketRepositorio,
				"O repositório de Tickets não pode ser nulo.");
		this.relogio = Objects.requireNonNull(relogio, "O relógio não pode ser nulo.");
		this.diasAntecedenciaFDS = diasAntecedenciaFDS;
		this.diasSemRespostaTicket = diasSemRespostaTicket;
	}

	public AlertasResponse executar() {
		LocalDate hoje = LocalDate.now(relogio);
		Instant agora = relogio.instant();

		List<AlertaFDSResponse> fdsAExpirar = fdsRepositorio.listarCandidatasAObsolescencia().stream()
				.filter(fds -> PoliticaValidadeFDS.deveGerarAlertaPreAviso(fds, hoje, diasAntecedenciaFDS))
				.map(AlertaMapper::paraFDSResponse)
				.toList();

		List<AlertaTicketResponse> ticketsSemResposta = ticketRepositorio.listarAbertos().stream()
				.filter(ticket -> PoliticaAlertaTicket.deveGerarAlertaSemResposta(ticket, agora,
						diasSemRespostaTicket))
				.map(AlertaMapper::paraTicketResponse)
				.toList();

		return new AlertasResponse(fdsAExpirar.size() + ticketsSemResposta.size(), fdsAExpirar, ticketsSemResposta);
	}
}
