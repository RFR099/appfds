package com.dstgroup.fds.application.port.out;

import java.util.Optional;

import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.domain.obra.Obra;
import com.dstgroup.fds.domain.obra.ObraId;

public interface ObraRepositoryPort {

	void guardar(Obra obra);

	Optional<Obra> obterPorId(ObraId id);

	Pagina<Obra> listar(int pagina, int tamanho);
}
