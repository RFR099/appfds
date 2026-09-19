package com.dstgroup.fds.infrastructure.persistence;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "obra")
public class ObraJpaEntity {

	@Id
	private UUID id;

	@Column(name = "nome", nullable = false)
	private String nome;

	@Column(name = "centro_produtivo_id", nullable = false)
	private UUID centroProdutivoId;

	protected ObraJpaEntity() {
		// exigido pelo JPA
	}

	public ObraJpaEntity(UUID id, String nome, UUID centroProdutivoId) {
		this.id = id;
		this.nome = nome;
		this.centroProdutivoId = centroProdutivoId;
	}

	public UUID getId() {
		return id;
	}

	public String getNome() {
		return nome;
	}

	public UUID getCentroProdutivoId() {
		return centroProdutivoId;
	}
}
