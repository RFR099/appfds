package com.dstgroup.fds.domain.fds;

import java.util.Set;

/**
 * Value Object que representa a imagem do produto químico (campo "IMAGEM DO
 * PRODUTO QUÍMICO" do protótipo) — apenas a <b>referência</b> (caminho/URL) e
 * metadados (tipo MIME, tamanho). O domínio nunca vê o binário da imagem em
 * si; isso é responsabilidade do {@code ImagemStoragePort} (Fase 3, Parte 4)
 * na fronteira da Application, e do adapter de storage concreto na
 * Infrastructure (Fase 3, Parte 5).
 */
public record ImagemProduto(String caminho, String tipoMime, long tamanhoBytes) {

	private static final long TAMANHO_MAXIMO_BYTES = 5L * 1024 * 1024; // 5 MB
	private static final Set<String> TIPOS_MIME_PERMITIDOS = Set.of("image/png", "image/jpeg", "image/webp");

	public ImagemProduto {
		if (caminho == null || caminho.isBlank()) {
			throw new ImagemProdutoInvalidaException("O caminho da imagem não pode ser vazio ou nulo.");
		}
		if (tipoMime == null || !TIPOS_MIME_PERMITIDOS.contains(tipoMime)) {
			throw new ImagemProdutoInvalidaException(
					"Tipo de imagem não suportado: '" + tipoMime + "'. Tipos permitidos: " + TIPOS_MIME_PERMITIDOS
			);
		}
		if (tamanhoBytes <= 0) {
			throw new ImagemProdutoInvalidaException("O tamanho da imagem deve ser positivo (recebido: "
					+ tamanhoBytes + ").");
		}
		if (tamanhoBytes > TAMANHO_MAXIMO_BYTES) {
			throw new ImagemProdutoInvalidaException(
					"A imagem excede o tamanho máximo permitido de " + TAMANHO_MAXIMO_BYTES + " bytes (recebido: "
							+ tamanhoBytes + ")."
			);
		}
	}
}
