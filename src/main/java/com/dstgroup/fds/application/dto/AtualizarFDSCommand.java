package com.dstgroup.fds.application.dto;

import java.time.LocalDate;
import java.util.Set;

import com.dstgroup.fds.domain.fds.PictogramaPerigo;

/**
 * Comando de entrada para {@code AtualizarFDSUseCase}.
 *
 * <p>{@code id} é obrigatório; todos os restantes campos são opcionais —
 * {@code null} significa "não alterar este campo", nunca "limpar o campo".
 * Limpar explicitamente fornecedor/e-mail/data de validade não é suportado
 * por este comando (ver {@code AtualizarFDSUseCase}).</p>
 *
 * <p>{@code pictogramas}, quando presente, substitui o conjunto completo —
 * o caso de uso reconcilia adições/remoções através dos métodos singulares
 * do agregado ({@code adicionarPictograma}/{@code removerPictograma}).</p>
 */
public record AtualizarFDSCommand(
		String id,
		String marca,
		String fornecedorId,
		String emailContacto,
		LocalDate dataRevisao,
		LocalDate dataValidade,
		Set<PictogramaPerigo> pictogramas
) {
}
