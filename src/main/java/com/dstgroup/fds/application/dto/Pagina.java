package com.dstgroup.fds.application.dto;

import java.util.List;

/**
 * DTO de paginação agnóstico de framework — a Application nunca usa
 * {@code org.springframework.data.domain.Pageable}/{@code Page} diretamente
 * (isso seria uma fuga de infraestrutura para dentro da camada de casos de
 * uso). O adapter de persistência (Parte 10) é que converte entre este tipo e
 * o {@code Pageable}/{@code Page} do Spring Data.
 */
public record Pagina<T>(List<T> conteudo, int pagina, int tamanho, long totalElementos) {

	public static <T> Pagina<T> vazia(int pagina, int tamanho) {
		return new Pagina<>(List.of(), pagina, tamanho, 0);
	}
}
