package com.dstgroup.fds.application.port.out;

import java.util.List;

import com.dstgroup.fds.domain.auditoria.RegistoAuditoriaFDS;
import com.dstgroup.fds.domain.fds.FDSId;

/**
 * Port de saída (Onion) para o histórico de auditoria de uma FDS (RF12).
 * Deliberadamente simples (sem paginação) — um histórico de transições de
 * estado de uma única FDS tende a ter poucas dezenas de entradas, não
 * milhares.
 */
public interface AuditoriaRepositoryPort {

	void registar(RegistoAuditoriaFDS registo);

	/**
	 * @return o histórico da FDS indicada, ordenado cronologicamente (mais
	 * antigo primeiro) — lista vazia se a FDS nunca transitou de estado.
	 */
	List<RegistoAuditoriaFDS> listarPorFDS(FDSId fdsId);
}
