package com.dstgroup.fds.domain.obra;

import java.util.Objects;

/**
 * Agregado raiz "Obra" — pertence ao mesmo bounded context de
 * {@link CentroProdutivo}, mas é o seu próprio agregado (referencia o Centro
 * Produtivo apenas pelo id, tal como {@code FichaDadosSeguranca} referencia
 * {@code Fornecedor}).
 */
public final class Obra {

	private final ObraId id;
	private final String nome;
	private final CentroProdutivoId centroProdutivoId;

	private Obra(ObraId id, String nome, CentroProdutivoId centroProdutivoId) {
		this.id = id;
		this.nome = validarNome(nome);
		this.centroProdutivoId = Objects.requireNonNull(centroProdutivoId, "O centro produtivo é obrigatório.");
	}

	public static Obra criar(String nome, CentroProdutivoId centroProdutivoId) {
		return new Obra(ObraId.gerar(), nome, centroProdutivoId);
	}

	/**
	 * Reconstitui uma obra já existente — uso exclusivo da Infrastructure.
	 * Preserva o id real, ao contrário de {@link #criar}.
	 */
	public static Obra reidratar(ObraId id, String nome, CentroProdutivoId centroProdutivoId) {
		return new Obra(id, nome, centroProdutivoId);
	}

	private static String validarNome(String nome) {
		if (nome == null || nome.isBlank()) {
			throw new NomeObraInvalidoException();
		}
		return nome.trim();
	}

	public ObraId id() {
		return id;
	}

	public String nome() {
		return nome;
	}

	public CentroProdutivoId centroProdutivoId() {
		return centroProdutivoId;
	}

	@Override
	public boolean equals(Object o) {
		if (this == o) {
			return true;
		}
		if (!(o instanceof Obra outra)) {
			return false;
		}
		return id.equals(outra.id);
	}

	@Override
	public int hashCode() {
		return id.hashCode();
	}
}
