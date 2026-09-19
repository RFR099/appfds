package com.dstgroup.fds.application.dto;

/**
 * Resposta do {@code CriarFDSUseCase}. Deliberadamente mínima — a Fase 1,
 * Parte 9 acrescenta {@code FDSResponse} com mais detalhe para consultas.
 */
public record CriarFDSResponse(String id) {
}
