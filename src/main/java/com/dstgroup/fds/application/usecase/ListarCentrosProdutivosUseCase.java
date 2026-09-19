package com.dstgroup.fds.application.usecase;

import com.dstgroup.fds.application.CentroProdutivoMapper;
import com.dstgroup.fds.application.dto.CentroProdutivoResumoResponse;
import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.port.out.CentroProdutivoRepositoryPort;
import com.dstgroup.fds.domain.obra.CentroProdutivo;

public class ListarCentrosProdutivosUseCase {

	private static final int TAMANHO_PAGINA_MAXIMO = 100;

	private final CentroProdutivoRepositoryPort repositorio;

	public ListarCentrosProdutivosUseCase(CentroProdutivoRepositoryPort repositorio) {
		this.repositorio = repositorio;
	}

	public Pagina<CentroProdutivoResumoResponse> executar(int pagina, int tamanho) {
		int paginaValida = Math.max(pagina, 0);
		int tamanhoValido = Math.min(Math.max(tamanho, 1), TAMANHO_PAGINA_MAXIMO);

		Pagina<CentroProdutivo> resultado = repositorio.listar(paginaValida, tamanhoValido);

		return new Pagina<>(
				resultado.conteudo().stream().map(CentroProdutivoMapper::paraResumo).toList(),
				resultado.pagina(),
				resultado.tamanho(),
				resultado.totalElementos()
		);
	}
}
