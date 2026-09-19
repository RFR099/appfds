package com.dstgroup.fds.infrastructure.persistence;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

/**
 * Entidade JPA de persistência da FDS — deliberadamente separada do agregado
 * de domínio {@code FichaDadosSeguranca} (regra do Onion: o domínio nunca tem
 * anotações JPA). A conversão entre os dois é feita por {@link FDSEntityMapper}.
 *
 * <p>Campo por campo "burro" — toda a lógica de negócio vive no agregado,
 * nunca aqui.</p>
 */
@Entity
@Table(name = "fds")
public class FDSJpaEntity {

	@Id
	private UUID id;

	@Column(name = "nome_produto_quimico", nullable = false)
	private String nomeProdutoQuimico;

	@Column(name = "marca", nullable = false)
	private String marca;

	@Column(name = "fornecedor_id")
	private UUID fornecedorId;

	@Column(name = "email_contacto")
	private String emailContacto;

	@Column(name = "estado", nullable = false)
	private String estado;

	@Column(name = "data_revisao")
	private LocalDate dataRevisao;

	@Column(name = "data_validade")
	private LocalDate dataValidade;

	@ElementCollection(fetch = FetchType.EAGER)
	@CollectionTable(name = "fds_pictogramas", joinColumns = @JoinColumn(name = "fds_id"))
	@Column(name = "pictograma")
	private Set<String> pictogramas = new HashSet<>();

	@ElementCollection(fetch = FetchType.EAGER)
	@CollectionTable(name = "fds_obras", joinColumns = @JoinColumn(name = "fds_id"))
	@Column(name = "obra_id")
	private Set<UUID> obras = new HashSet<>();

	@Column(name = "imagem_caminho")
	private String imagemCaminho;

	@Column(name = "imagem_tipo_mime")
	private String imagemTipoMime;

	@Column(name = "imagem_tamanho_bytes")
	private Long imagemTamanhoBytes;

	@Column(name = "tem_dissocianatos", nullable = false)
	private boolean temDissocianatos;

	protected FDSJpaEntity() {
		// exigido pelo JPA (proxies/reflexão) — nunca usado diretamente pelo código da aplicação
	}

	public FDSJpaEntity(UUID id, String nomeProdutoQuimico, String marca, UUID fornecedorId, String emailContacto,
			String estado, LocalDate dataRevisao, LocalDate dataValidade, Set<String> pictogramas,
			Set<UUID> obras, String imagemCaminho, String imagemTipoMime, Long imagemTamanhoBytes,
			boolean temDissocianatos) {
		this.id = id;
		this.nomeProdutoQuimico = nomeProdutoQuimico;
		this.marca = marca;
		this.fornecedorId = fornecedorId;
		this.emailContacto = emailContacto;
		this.estado = estado;
		this.dataRevisao = dataRevisao;
		this.dataValidade = dataValidade;
		this.pictogramas = pictogramas == null ? new HashSet<>() : new HashSet<>(pictogramas);
		this.obras = obras == null ? new HashSet<>() : new HashSet<>(obras);
		this.imagemCaminho = imagemCaminho;
		this.imagemTipoMime = imagemTipoMime;
		this.imagemTamanhoBytes = imagemTamanhoBytes;
		this.temDissocianatos = temDissocianatos;
	}

	public UUID getId() {
		return id;
	}

	public String getNomeProdutoQuimico() {
		return nomeProdutoQuimico;
	}

	public String getMarca() {
		return marca;
	}

	public UUID getFornecedorId() {
		return fornecedorId;
	}

	public String getEmailContacto() {
		return emailContacto;
	}

	public String getEstado() {
		return estado;
	}

	public LocalDate getDataRevisao() {
		return dataRevisao;
	}

	public LocalDate getDataValidade() {
		return dataValidade;
	}

	public Set<String> getPictogramas() {
		return pictogramas;
	}

	public Set<UUID> getObras() {
		return obras;
	}

	public String getImagemCaminho() {
		return imagemCaminho;
	}

	public String getImagemTipoMime() {
		return imagemTipoMime;
	}

	public Long getImagemTamanhoBytes() {
		return imagemTamanhoBytes;
	}

	public boolean isTemDissocianatos() {
		return temDissocianatos;
	}
}
