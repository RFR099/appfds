package com.dstgroup.fds.application.usecase;

import com.dstgroup.fds.application.FornecedorMapper;
import com.dstgroup.fds.application.dto.FornecedorResumoResponse;
import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.port.out.FornecedorRepositoryPort;
import com.dstgroup.fds.domain.fornecedor.Fornecedor;

public class ListarFornecedoresUseCase {

	private static final int TAMANHO_PAGINA_MAXIMO = 100;

	private final FornecedorRepositoryPort repositorio;

	public ListarFornecedoresUseCase(FornecedorRepositoryPort repositorio) {
		this.repositorio = repositorio;
	}

	public Pagina<FornecedorResumoResponse> executar(int pagina, int tamanho) {
		int paginaValida = Math.max(pagina, 0);
		int tamanhoValido = Math.min(Math.max(tamanho, 1), TAMANHO_PAGINA_MAXIMO);

		Pagina<Fornecedor> resultado = repositorio.listar(paginaValida, tamanhoValido);

		return new Pagina<>(
				resultado.conteudo().stream().map(FornecedorMapper::paraResumo).toList(),
				resultado.pagina(),
				resultado.tamanho(),
				resultado.totalElementos()
		);
	}
}
