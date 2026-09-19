package com.dstgroup.fds.application.port.out;

/**
 * Port de saída (Onion): abstrai o envio de uma notificação (e-mail, hoje —
 * outro canal amanhã) a um destinatário. Deliberadamente genérico (não
 * "NotificadorDeTicket") para ser reutilizado por qualquer caso de uso que
 * precise de notificar alguém — os Alertas (Fase 4, Parte 6) também vão
 * usar este mesmo port.
 */
public interface NotificadorPort {

	/**
	 * @param destinatario endereço de e-mail (ou equivalente, consoante o
	 *                      adapter) a notificar
	 * @param assunto       assunto da mensagem
	 * @param corpo         corpo da mensagem
	 */
	void enviar(String destinatario, String assunto, String corpo);
}
