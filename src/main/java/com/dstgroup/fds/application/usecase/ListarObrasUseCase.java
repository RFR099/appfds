package com.dstgroup.fds.application.usecase;

import com.dstgroup.fds.application.ObraMapper;
import com.dstgroup.fds.application.dto.ObraResumoResponse;
import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.port.out.ObraRepositoryPort;
import com.dstgroup.fds.domain.obra.Obra;

public class ListarObrasUseCase {

	private static final int TAMANHO_PAGINA_MAXIMO = 100;

	private final ObraRepositoryPort repositorio;

	public ListarObrasUseCase(ObraRepositoryPort repositorio) {
		this.repositorio = repositorio;
	}

	public Pagina<ObraResumoResponse> executar(int pagina, int tamanho) {
		int paginaValida = Math.max(pagina, 0);
		int tamanhoValido = Math.min(Math.max(tamanho, 1), TAMANHO_PAGINA_MAXIMO);

		Pagina<Obra> resultado = repositorio.listar(paginaValida, tamanhoValido);

		return new Pagina<>(
				resultado.conteudo().stream().map(ObraMapper::paraResumo).toList(),
				resultado.pagina(),
				resultado.tamanho(),
				resultado.totalElementos()
		);
	}
}
