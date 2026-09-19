package com.dstgroup.fds.application.dto;

import java.time.LocalDate;

/**
 * Resposta resumida de uma FDS, para a tabela de listagem (ver protótipo:
 * colunas Nome, Marca, Fornecedor, Estado, Data de Revisão).
 *
 * <p>{@code fornecedorId} é exposto como identificador puro — a resolução
 * para o nome do fornecedor só é possível a partir da Fase 2, quando o
 * agregado {@code Fornecedor} (com nome, contactos, etc.) existir. Até lá, a
 * presentation/frontend mostra o id ou faz uma consulta adicional.</p>
 */
public record FDSResumoResponse(
		String id,
		String nomeProdutoQuimico,
		String marca,
		String fornecedorId,
		String estado,
		LocalDate dataRevisao
) {
}
