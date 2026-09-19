package com.dstgroup.fds.infrastructure.notification;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

import com.dstgroup.fds.application.port.out.NotificadorPort;

/**
 * Adapter de saída (Onion): envia notificações por e-mail via Spring Mail.
 *
 * <p>Em desenvolvimento aponta para o MailHog do {@code docker-compose.yml}
 * (SMTP na porta 1025, UI de inspeção na 8025) — nenhum e-mail real sai da
 * máquina de desenvolvimento.</p>
 */
@Component
public class EmailNotificadorAdapter implements NotificadorPort {

	private final JavaMailSender mailSender;
	private final String remetente;

	public EmailNotificadorAdapter(JavaMailSender mailSender,
			@Value("${app.mail.remetente:noreply@dstgroup.pt}") String remetente) {
		this.mailSender = mailSender;
		this.remetente = remetente;
	}

	@Override
	public void enviar(String destinatario, String assunto, String corpo) {
		SimpleMailMessage mensagem = new SimpleMailMessage();
		mensagem.setFrom(remetente);
		mensagem.setTo(destinatario);
		mensagem.setSubject(assunto);
		mensagem.setText(corpo);
		mailSender.send(mensagem);
	}
}
