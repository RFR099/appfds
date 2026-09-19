package com.dstgroup.fds.application.port.out;

import java.util.List;
import java.util.Optional;

import com.dstgroup.fds.application.dto.FiltroFDS;
import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.domain.fds.FDSId;
import com.dstgroup.fds.domain.fds.FichaDadosSeguranca;
import com.dstgroup.fds.domain.fds.Marca;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;

/**
 * Port de saída (Onion): abstrai a persistência de {@link FichaDadosSeguranca}.
 *
 * <p>Definido aqui, na camada de Application — a implementação real (Spring
 * Data JPA + PostgreSQL) só chega na Parte 10, em
 * {@code infrastructure/persistence}. Até lá, os casos de uso são testados
 * com um "fake" deste port, sem qualquer base de dados.</p>
 */
public interface FDSRepositoryPort {

	/**
	 * @return {@code true} se já existir uma FDS ativa com o mesmo Nome de
	 * produto, Marca e Fornecedor — usado para aplicar a invariante de
	 * unicidade (RF15) antes de criar uma nova FDS.
	 */
	boolean existeDuplicado(String nomeProdutoQuimico, Marca marca, FornecedorId fornecedorId);

	/**
	 * Persiste (cria ou atualiza) a FDS.
	 */
	void guardar(FichaDadosSeguranca fds);

	/**
	 * @return a FDS com o id indicado, ou vazio se não existir.
	 */
	Optional<FichaDadosSeguranca> obterPorId(FDSId id);

	/**
	 * Lista FDS paginadas, opcionalmente filtradas por {@link FiltroFDS}
	 * (Fase 2, Parte 7/8 — antes só existia paginação sem filtros).
	 *
	 * @param filtro  critério de pesquisa; {@link FiltroFDS#vazio()} devolve
	 *                tudo, sem filtrar
	 * @param pagina  número da página, a partir de 0
	 * @param tamanho tamanho da página
	 */
	Pagina<FichaDadosSeguranca> listar(FiltroFDS filtro, int pagina, int tamanho);

	/**
	 * @return todas as FDS candidatas a obsolescência: com {@code DataValidade}
	 * definida e num estado que ainda permite transitar para
	 * {@code OBSOLETA} ({@code ATUALIZADA} ou {@code SOLICITADA_AO_FORNECEDOR}).
	 * Sem paginação — é uma operação de manutenção em lote (job agendado da
	 * Fase 3, Parte 8), não uma listagem para UI.
	 */
	List<FichaDadosSeguranca> listarCandidatasAObsolescencia();
}

