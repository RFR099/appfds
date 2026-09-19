package com.dstgroup.fds.application.port.out;

import java.util.Optional;

import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.domain.fornecedor.Fornecedor;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;

/**
 * Port de saída (Onion): abstrai a persistência de {@link Fornecedor}.
 * Implementação real (Spring Data JPA) chega na Parte 3 desta fase.
 */
public interface FornecedorRepositoryPort {

	void guardar(Fornecedor fornecedor);

	Optional<Fornecedor> obterPorId(FornecedorId id);

	Pagina<Fornecedor> listar(int pagina, int tamanho);
}
