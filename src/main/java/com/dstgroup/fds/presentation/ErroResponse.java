package com.dstgroup.fds.presentation;

import java.util.Objects;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Corpo de resposta consistente para todos os erros da API (Fase 5, Parte
 * 3) — substitui o {@code Map.of(...)} ad-hoc que existia antes em
 * {@link GlobalExceptionHandler}, dando um formato único e com tipos a
 * qualquer erro devolvido, seja qual for o {@code @ExceptionHandler} que o
 * produziu.
 *
 * <p>Vive na Presentation (não na Application/Domain) porque "resposta
 * HTTP" é vocabulário de fronteira externa — mas, tal como
 * {@link GlobalExceptionHandler}, não tem nenhuma anotação Spring: é uma
 * classe simples, o que a torna trivial de construir e comparar em testes
 * sem subir nenhum contexto Spring.</p>
 */
@Schema(description = "Formato único para qualquer erro devolvido por esta API.")
public record ErroResponse(
		@Schema(description = "Instante em que o erro ocorreu (ISO-8601, UTC).",
				example = "2026-06-01T10:00:00Z") String timestamp,
		@Schema(description = "Código de estado HTTP, repetido no corpo por conveniência.",
				example = "400") int status,
		@Schema(description = "Mensagem legível por humanos — nunca a mensagem técnica interna "
				+ "de uma exceção (ver GlobalExceptionHandler).",
				example = "Identificador inválido: fds — 'isto-nao-e-um-uuid'.") String mensagem) {

	public ErroResponse {
		Objects.requireNonNull(timestamp, "O timestamp do erro é obrigatório.");
		Objects.requireNonNull(mensagem, "A mensagem do erro é obrigatória.");
	}
}
