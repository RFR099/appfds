package com.dstgroup.fds.infrastructure.persistence;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

/**
 * Entidade JPA de persistência do Fornecedor — separada do agregado de
 * domínio, tal como {@code FDSJpaEntity}.
 *
 * <p>{@code contactos} usa {@code @OrderColumn} para preservar a ordem da
 * {@code List<String>} do domínio (uma coleção JPA sem coluna de ordem seria
 * tratada como "bag" desordenado).</p>
 */
@Entity
@Table(name = "fornecedor")
public class FornecedorJpaEntity {

	@Id
	private UUID id;

	@Column(name = "nome", nullable = false)
	private String nome;

	@Column(name = "email_principal", nullable = false)
	private String emailPrincipal;

	@ElementCollection(fetch = FetchType.EAGER)
	@CollectionTable(name = "fornecedor_contactos", joinColumns = @JoinColumn(name = "fornecedor_id"))
	@OrderColumn(name = "posicao")
	@Column(name = "contacto")
	private List<String> contactos = new ArrayList<>();

	protected FornecedorJpaEntity() {
		// exigido pelo JPA
	}

	public FornecedorJpaEntity(UUID id, String nome, String emailPrincipal, List<String> contactos) {
		this.id = id;
		this.nome = nome;
		this.emailPrincipal = emailPrincipal;
		this.contactos = contactos == null ? new ArrayList<>() : new ArrayList<>(contactos);
	}

	public UUID getId() {
		return id;
	}

	public String getNome() {
		return nome;
	}

	public String getEmailPrincipal() {
		return emailPrincipal;
	}

	public List<String> getContactos() {
		return contactos;
	}
}
