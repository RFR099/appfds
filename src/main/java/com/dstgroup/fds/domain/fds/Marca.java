package com.dstgroup.fds.domain.fds;

/**
 * Value Object que representa a marca comercial de um produto químico
 * (ex.: "3M", "A2Brios").
 *
 * <p>Imutável, sem dependências de framework.</p>
 */
public record Marca(String nome) {

	private static final int TAMANHO_MAXIMO = 100;

	public Marca {
		if (nome == null || nome.isBlank()) {
			throw new MarcaInvalidaException("O nome da marca não pode ser vazio ou nulo.");
		}
		nome = nome.trim();
		if (nome.length() > TAMANHO_MAXIMO) {
			throw new MarcaInvalidaException(
					"O nome da marca não pode exceder " + TAMANHO_MAXIMO + " caracteres (tem " + nome.length() + ")."
			);
		}
	}
}
