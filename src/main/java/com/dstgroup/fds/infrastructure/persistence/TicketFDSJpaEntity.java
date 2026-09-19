package com.dstgroup.fds.infrastructure.persistence;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

import com.dstgroup.fds.domain.ticket.EstadoTicket;

/**
 * Entidade JPA de persistência do {@code TicketFDS} — separada do agregado
 * de domínio, tal como {@code FDSJpaEntity}/{@code FornecedorJpaEntity}.
 *
 * <p>{@code fdsId} é opcional (pedido de FDS ainda não catalogada).
 * {@code mensagens} usa {@code @OrderColumn} para preservar a ordem
 * cronológica da conversa — sem isso o JPA trataria a coleção como "bag"
 * desordenado.</p>
 */
@Entity
@Table(name = "ticket_fds")
public class TicketFDSJpaEntity {

	@Id
	private UUID id;

	@Column(name = "fds_id")
	private UUID fdsId;

	@Column(name = "fornecedor_id", nullable = false)
	private UUID fornecedorId;

	@Enumerated(EnumType.STRING)
	@Column(name = "estado", nullable = false)
	private EstadoTicket estado;

	@Column(name = "data_abertura", nullable = false)
	private Instant dataAbertura;

	@ElementCollection(fetch = FetchType.EAGER)
	@CollectionTable(name = "ticket_fds_mensagens", joinColumns = @JoinColumn(name = "ticket_fds_id"))
	@OrderColumn(name = "posicao")
	private List<MensagemTicketEmbeddable> mensagens = new ArrayList<>();

	protected TicketFDSJpaEntity() {
		// exigido pelo JPA
	}

	public TicketFDSJpaEntity(UUID id, UUID fdsId, UUID fornecedorId, EstadoTicket estado, Instant dataAbertura,
			List<MensagemTicketEmbeddable> mensagens) {
		this.id = id;
		this.fdsId = fdsId;
		this.fornecedorId = fornecedorId;
		this.estado = estado;
		this.dataAbertura = dataAbertura;
		this.mensagens = mensagens == null ? new ArrayList<>() : new ArrayList<>(mensagens);
	}

	public UUID getId() {
		return id;
	}

	public UUID getFdsId() {
		return fdsId;
	}

	public UUID getFornecedorId() {
		return fornecedorId;
	}

	public EstadoTicket getEstado() {
		return estado;
	}

	public Instant getDataAbertura() {
		return dataAbertura;
	}

	public List<MensagemTicketEmbeddable> getMensagens() {
		return mensagens;
	}
}
