package com.dstgroup.fds.application.port.out;

import java.util.Optional;

import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.domain.obra.CentroProdutivo;
import com.dstgroup.fds.domain.obra.CentroProdutivoId;

public interface CentroProdutivoRepositoryPort {

	void guardar(CentroProdutivo centro);

	Optional<CentroProdutivo> obterPorId(CentroProdutivoId id);

	Pagina<CentroProdutivo> listar(int pagina, int tamanho);
}
