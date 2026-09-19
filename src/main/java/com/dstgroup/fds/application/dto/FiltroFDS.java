package com.dstgroup.fds.application.dto;

import com.dstgroup.fds.domain.fds.EstadoFDS;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;
import com.dstgroup.fds.domain.obra.CentroProdutivoId;
import com.dstgroup.fds.domain.obra.ObraId;

/**
 * Critério de pesquisa para listar FDS (RF03), espelhando exatamente os
 * campos do protótipo: Centro Produtivo, Nome, Fornecedor, Obra, Marca,
 * Estado. Todos os campos são opcionais — {@code null} significa "sem
 * filtro nesse campo".
 *
 * <p>Vive em {@code application.dto} (não em {@code domain.fds}) porque é um
 * critério de pesquisa, não uma regra de negócio — mesma justificação que
 * {@link Pagina}. Isso também evita acoplar {@code domain.fds} tanto a
 * {@code domain.fornecedor} como a {@code domain.obra} só para descrever como
 * filtrar uma listagem.</p>
 *
 * <p>Filtrar por {@code centroProdutivoId} não implica que a FDS guarde essa
 * relação diretamente — é resolvido pela Infrastructure (Parte 8) através de
 * um JOIN {@code fds_obras -> obra -> centro_produtivo}, evitando duplicar a
 * associação Obra/Centro Produtivo em dois sítios.</p>
 */
public record FiltroFDS(
		CentroProdutivoId centroProdutivoId,
		String nome,
		FornecedorId fornecedorId,
		ObraId obraId,
		String marca,
		EstadoFDS estado
) {

	public static FiltroFDS vazio() {
		return new FiltroFDS(null, null, null, null, null, null);
	}

	public boolean temAlgumFiltro() {
		return centroProdutivoId != null || nome != null || fornecedorId != null
				|| obraId != null || marca != null || estado != null;
	}
}
