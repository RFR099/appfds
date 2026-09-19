package com.dstgroup.fds.application.dto;

import java.time.LocalDate;
import java.util.Set;

/**
 * Resposta detalhada de uma FDS (ex.: {@code GET /fds/{id}}).
 *
 * <p>{@code dataRevisao}/{@code dataValidade} vêm separadas aqui (ao
 * contrário do domínio, onde vivem juntas no VO {@code DataValidade}) porque
 * é assim que a presentation/frontend as consome — dois campos de formulário
 * distintos.</p>
 */
public record FDSResponse(
		String id,
		String nomeProdutoQuimico,
		String marca,
		String fornecedorId,
		String emailContacto,
		String estado,
		LocalDate dataRevisao,
		LocalDate dataValidade,
		Set<String> pictogramas,
		Set<String> obrasIds,
		String imagemCaminho,
		String imagemTipoMime,
		boolean temDissocianatos
) {
}
