package com.dstgroup.fds.application.dto;

import java.time.LocalDate;
import java.util.Set;

import com.dstgroup.fds.domain.fds.PictogramaPerigo;

/**
 * Comando de entrada para {@code CriarFDSUseCase} — dados crus vindos da
 * camada de apresentação (ex.: corpo de um {@code POST /fds}), ainda não
 * convertidos em Value Objects de domínio. Essa conversão (e a validação que
 * a acompanha) é responsabilidade exclusiva do caso de uso.
 *
 * <p>Campos nullable ({@code fornecedorId}, {@code emailContacto},
 * {@code dataRevisao}, {@code dataValidade}, {@code pictogramas},
 * {@code obrasIds}) suportam a criação de um rascunho incompleto (RF06).</p>
 */
public record CriarFDSCommand(
		String nomeProdutoQuimico,
		String marca,
		String fornecedorId,
		String emailContacto,
		LocalDate dataRevisao,
		LocalDate dataValidade,
		Set<PictogramaPerigo> pictogramas,
		Set<String> obrasIds
) {
}
