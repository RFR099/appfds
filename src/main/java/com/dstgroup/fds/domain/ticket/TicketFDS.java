package com.dstgroup.fds.domain.ticket;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

import com.dstgroup.fds.domain.fds.FDSId;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;

/**
 * Agregado raiz "Ticket": pedido formal a um fornecedor para obter ou
 * atualizar uma FDS (RF07).
 *
 * <p>{@code fdsId} pode ser {@code null} — representa um pedido de FDS que
 * ainda não existe no catálogo (produto novo), em vez de um pedido de
 * atualização de uma FDS já existente.</p>
 *
 * <p><b>Identidade</b>: {@link TicketFDSId}, gerado internamente em
 * {@link #abrir}. Igualdade por identidade, não por valor.</p>
 */
public final class TicketFDS {

	private final TicketFDSId id;
	private final FDSId fdsId;
	private final FornecedorId fornecedorId;
	private EstadoTicket estado;
	private final Instant dataAbertura;
	private final List<MensagemTicket> mensagens;

	private TicketFDS(TicketFDSId id, FDSId fdsId, FornecedorId fornecedorId, EstadoTicket estado,
			Instant dataAbertura, List<MensagemTicket> mensagens) {
		this.id = Objects.requireNonNull(id, "O id do ticket não pode ser nulo.");
		this.fdsId = fdsId;
		this.fornecedorId = Objects.requireNonNull(fornecedorId, "O fornecedor é obrigatório.");
		this.estado = Objects.requireNonNull(estado, "O estado não pode ser nulo.");
		this.dataAbertura = Objects.requireNonNull(dataAbertura, "A data de abertura não pode ser nula.");
		this.mensagens = mensagens == null ? new ArrayList<>() : new ArrayList<>(mensagens);
	}

	/**
	 * @param fdsId {@code null} para um pedido de FDS nova (produto ainda não
	 *              catalogado); caso contrário, a FDS existente a atualizar.
	 */
	public static TicketFDS abrir(FDSId fdsId, FornecedorId fornecedorId, Instant dataAbertura) {
		return new TicketFDS(TicketFDSId.gerar(), fdsId, fornecedorId, EstadoTicket.ABERTO, dataAbertura, null);
	}

	/**
	 * Reconstitui um ticket já existente — uso exclusivo da Infrastructure.
	 * Preserva o id real, ao contrário de {@link #abrir}.
	 */
	public static TicketFDS reidratar(TicketFDSId id, FDSId fdsId, FornecedorId fornecedorId, EstadoTicket estado,
			Instant dataAbertura, List<MensagemTicket> mensagens) {
		return new TicketFDS(id, fdsId, fornecedorId, estado, dataAbertura, mensagens);
	}

	/**
	 * @param dataEnvio recebida por parâmetro (nunca {@code Instant.now()}
	 *                  interno) — ver nota de determinismo em {@link MensagemTicket}.
	 */
	public void adicionarMensagem(String autor, String texto, Instant dataEnvio) {
		if (estado == EstadoTicket.FECHADO) {
			throw new TicketFDSFechadoException();
		}
		mensagens.add(new MensagemTicket(autor, texto, dataEnvio));
	}

	public void marcarComoRespondido() {
		this.estado = this.estado.transicionarPara(EstadoTicket.RESPONDIDO);
	}

	public void fechar() {
		this.estado = this.estado.transicionarPara(EstadoTicket.FECHADO);
	}

	// --- Consultas ---

	public TicketFDSId id() {
		return id;
	}

	public FDSId fdsId() {
		return fdsId;
	}

	public FornecedorId fornecedorId() {
		return fornecedorId;
	}

	public EstadoTicket estado() {
		return estado;
	}

	public Instant dataAbertura() {
		return dataAbertura;
	}

	public List<MensagemTicket> mensagens() {
		return Collections.unmodifiableList(mensagens);
	}

	// --- Identidade ---

	@Override
	public boolean equals(Object o) {
		if (this == o) {
			return true;
		}
		if (!(o instanceof TicketFDS outro)) {
			return false;
		}
		return id.equals(outro.id);
	}

	@Override
	public int hashCode() {
		return id.hashCode();
	}
}
