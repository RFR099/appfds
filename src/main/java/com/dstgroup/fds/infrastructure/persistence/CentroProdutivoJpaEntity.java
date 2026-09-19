package com.dstgroup.fds.infrastructure.persistence;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "centro_produtivo")
public class CentroProdutivoJpaEntity {

	@Id
	private UUID id;

	@Column(name = "nome", nullable = false)
	private String nome;

	@Column(name = "localizacao")
	private String localizacao;

	protected CentroProdutivoJpaEntity() {
		// exigido pelo JPA
	}

	public CentroProdutivoJpaEntity(UUID id, String nome, String localizacao) {
		this.id = id;
		this.nome = nome;
		this.localizacao = localizacao;
	}

	public UUID getId() {
		return id;
	}

	public String getNome() {
		return nome;
	}

	public String getLocalizacao() {
		return localizacao;
	}
}
