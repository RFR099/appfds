package com.dstgroup.fds.application.usecase;

import com.dstgroup.fds.application.FDSMapper;
import com.dstgroup.fds.application.dto.FDSResumoResponse;
import com.dstgroup.fds.application.dto.FiltroFDS;
import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.port.out.FDSRepositoryPort;
import com.dstgroup.fds.domain.fds.FichaDadosSeguranca;

/**
 * Caso de uso: listar FDS paginadas, com filtros opcionais (RF03 — ex.:
 * {@code GET /fds}), tal como no protótipo: Centro Produtivo, Nome,
 * Fornecedor, Obra, Marca e Estado.
 */
public class ListarFDSUseCase {

	private static final int TAMANHO_PAGINA_MAXIMO = 100;

	private final FDSRepositoryPort repositorio;

	public ListarFDSUseCase(FDSRepositoryPort repositorio) {
		this.repositorio = repositorio;
	}

	public Pagina<FDSResumoResponse> executar(FiltroFDS filtro, int pagina, int tamanho) {
		FiltroFDS filtroValido = filtro == null ? FiltroFDS.vazio() : filtro;
		int paginaValida = Math.max(pagina, 0);
		int tamanhoValido = Math.min(Math.max(tamanho, 1), TAMANHO_PAGINA_MAXIMO);

		Pagina<FichaDadosSeguranca> resultado = repositorio.listar(filtroValido, paginaValida, tamanhoValido);

		return new Pagina<>(
				resultado.conteudo().stream().map(FDSMapper::paraResumo).toList(),
				resultado.pagina(),
				resultado.tamanho(),
				resultado.totalElementos()
		);
	}
}
