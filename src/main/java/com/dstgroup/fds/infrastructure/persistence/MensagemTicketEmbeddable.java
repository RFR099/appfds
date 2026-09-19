package com.dstgroup.fds.infrastructure.persistence;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/**
 * Projeção de persistência de {@code MensagemTicket} — embutida na coleção
 * do {@link TicketFDSJpaEntity}, tal como {@code contactos} em
 * {@code FornecedorJpaEntity}, mas aqui como objeto (autor+texto+data) em
 * vez de {@code String} simples.
 */
@Embeddable
public class MensagemTicketEmbeddable {

	@Column(name = "autor", nullable = false)
	private String autor;

	@Column(name = "texto", columnDefinition = "TEXT", nullable = false)
	private String texto;

	@Column(name = "data_envio", nullable = false)
	private Instant dataEnvio;

	protected MensagemTicketEmbeddable() {
		// exigido pelo JPA
	}

	public MensagemTicketEmbeddable(String autor, String texto, Instant dataEnvio) {
		this.autor = autor;
		this.texto = texto;
		this.dataEnvio = dataEnvio;
	}

	public String getAutor() {
		return autor;
	}

	public String getTexto() {
		return texto;
	}

	public Instant getDataEnvio() {
		return dataEnvio;
	}
}
