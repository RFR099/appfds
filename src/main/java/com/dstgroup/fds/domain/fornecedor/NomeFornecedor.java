package com.dstgroup.fds.domain.fornecedor;

/**
 * Value Object que representa o nome de um fornecedor (ex.: "3M",
 * "Industrial Química Riojana S.A").
 *
 * <p>Tem forma parecida com {@code Marca} (domain.fds), mas é um conceito
 * próprio deste bounded context — cada contexto tem a sua "linguagem
 * ubíqua", mesmo quando a validação técnica é semelhante.</p>
 */
public record NomeFornecedor(String valor) {

	private static final int TAMANHO_MAXIMO = 150;

	public NomeFornecedor {
		if (valor == null || valor.isBlank()) {
			throw new NomeFornecedorInvalidoException("O nome do fornecedor não pode ser vazio ou nulo.");
		}
		valor = valor.trim();
		if (valor.length() > TAMANHO_MAXIMO) {
			throw new NomeFornecedorInvalidoException(
					"O nome do fornecedor não pode exceder " + TAMANHO_MAXIMO + " caracteres (tem "
							+ valor.length() + ")."
			);
		}
	}
}
