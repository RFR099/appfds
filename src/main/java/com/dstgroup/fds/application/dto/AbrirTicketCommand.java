package com.dstgroup.fds.application.dto;

/**
 * Comando de entrada para {@code AbrirTicketUseCase}.
 *
 * <p>{@code fdsId} é opcional — {@code null} representa um pedido de FDS
 * nova (produto ainda não catalogado). {@code mensagemInicial} também é
 * opcional; quando presente, {@code autorMensagemInicial} é obrigatório
 * (validado pelo próprio VO {@code MensagemTicket} do domínio).</p>
 */
public record AbrirTicketCommand(String fdsId, String fornecedorId, String mensagemInicial,
		String autorMensagemInicial) {
}
