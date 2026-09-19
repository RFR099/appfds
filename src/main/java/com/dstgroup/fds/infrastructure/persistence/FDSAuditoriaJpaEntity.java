package com.dstgroup.fds.infrastructure.persistence;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "fds_auditoria")
public class FDSAuditoriaJpaEntity {

	@Id
	private UUID id;

	@Column(name = "fds_id", nullable = false)
	private UUID fdsId;

	@Column(name = "estado_anterior", nullable = false)
	private String estadoAnterior;

	@Column(name = "estado_novo", nullable = false)
	private String estadoNovo;

	@Column(name = "ocorrido_em", nullable = false)
	private Instant ocorridoEm;

	// Nullable por natureza — ver javadoc de RegistoAuditoriaFDS: fica a null
	// quando a transição é despoletada por um processo automático sem
	// utilizador humano associado (ex.: o job agendado de obsolescência).
	@Column(name = "utilizador")
	private String utilizador;

	protected FDSAuditoriaJpaEntity() {
		// exigido pelo JPA
	}

	public FDSAuditoriaJpaEntity(UUID id, UUID fdsId, String estadoAnterior, String estadoNovo, Instant ocorridoEm,
			String utilizador) {
		this.id = id;
		this.fdsId = fdsId;
		this.estadoAnterior = estadoAnterior;
		this.estadoNovo = estadoNovo;
		this.ocorridoEm = ocorridoEm;
		this.utilizador = utilizador;
	}

	public UUID getId() {
		return id;
	}

	public UUID getFdsId() {
		return fdsId;
	}

	public String getEstadoAnterior() {
		return estadoAnterior;
	}

	public String getEstadoNovo() {
		return estadoNovo;
	}

	public Instant getOcorridoEm() {
		return ocorridoEm;
	}

	public String getUtilizador() {
		return utilizador;
	}
}
