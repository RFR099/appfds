package com.dstgroup.fds.domain.obra;

/**
 * Agregado raiz do bounded context de suporte "Gestão de Obras/Centros
 * Produtivos". O mais simples dos agregados até agora: apenas nome
 * (obrigatório) e localização (opcional), sem VO dedicado por campo — segue
 * o mesmo padrão de validação inline já usado para
 * {@code FichaDadosSeguranca.nomeProdutoQuimico}.
 */
public final class CentroProdutivo {

	private final CentroProdutivoId id;
	private final String nome;
	private final String localizacao;

	private CentroProdutivo(CentroProdutivoId id, String nome, String localizacao) {
		this.id = id;
		this.nome = validarNome(nome);
		this.localizacao = localizacao == null ? null : localizacao.trim();
	}

	public static CentroProdutivo criar(String nome, String localizacao) {
		return new CentroProdutivo(CentroProdutivoId.gerar(), nome, localizacao);
	}

	/**
	 * Reconstitui um centro produtivo já existente — uso exclusivo da
	 * Infrastructure. Preserva o id real, ao contrário de {@link #criar}.
	 */
	public static CentroProdutivo reidratar(CentroProdutivoId id, String nome, String localizacao) {
		return new CentroProdutivo(id, nome, localizacao);
	}

	private static String validarNome(String nome) {
		if (nome == null || nome.isBlank()) {
			throw new NomeCentroProdutivoInvalidoException();
		}
		return nome.trim();
	}

	public CentroProdutivoId id() {
		return id;
	}

	public String nome() {
		return nome;
	}

	public String localizacao() {
		return localizacao;
	}

	@Override
	public boolean equals(Object o) {
		if (this == o) {
			return true;
		}
		if (!(o instanceof CentroProdutivo outro)) {
			return false;
		}
		return id.equals(outro.id);
	}

	@Override
	public int hashCode() {
		return id.hashCode();
	}
}
