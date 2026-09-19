package com.dstgroup.fds.domain.fds;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

import com.dstgroup.fds.domain.shared.IdentificadorInvalidoException;

/**
 * Ciclo de vida de uma {@code FichaDadosSeguranca}.
 *
 * <pre>
 *              ┌────────────────────────────┐
 *              ▼                            │
 *  RASCUNHO ──────► ATUALIZADA ◄───► SOLICITADA_AO_FORNECEDOR
 *     ▲                  │                       │
 *     │                  ▼                       ▼
 *     └──────────────  OBSOLETA  ◄────────────────┘
 * </pre>
 *
 * <p>Uma FDS {@code OBSOLETA} nunca transita diretamente para
 * {@code ATUALIZADA} — tem de reentrar pelo {@code RASCUNHO}, o que obriga a
 * uma revisão explícita (nova Data de Revisão e Data de Validade), conforme
 * a invariante de negócio documentada no agregado {@code FichaDadosSeguranca}.</p>
 *
 * <p>A matriz de transições é representada como dados ({@link Map}), não como
 * lógica condicional dispersa — mais fácil de rever, testar exaustivamente e
 * alterar no futuro.</p>
 */
public enum EstadoFDS {

	RASCUNHO,
	ATUALIZADA,
	SOLICITADA_AO_FORNECEDOR,
	OBSOLETA;

	private static final Map<EstadoFDS, Set<EstadoFDS>> TRANSICOES_VALIDAS = construirMatrizDeTransicoes();

	private static Map<EstadoFDS, Set<EstadoFDS>> construirMatrizDeTransicoes() {
		Map<EstadoFDS, Set<EstadoFDS>> matriz = new EnumMap<>(EstadoFDS.class);
		matriz.put(RASCUNHO, EnumSet.of(ATUALIZADA, SOLICITADA_AO_FORNECEDOR));
		matriz.put(ATUALIZADA, EnumSet.of(SOLICITADA_AO_FORNECEDOR, OBSOLETA));
		matriz.put(SOLICITADA_AO_FORNECEDOR, EnumSet.of(ATUALIZADA, OBSOLETA));
		matriz.put(OBSOLETA, EnumSet.of(RASCUNHO));
		return Map.copyOf(matriz);
	}

	/**
	 * @return {@code true} se for permitido transitar deste estado para {@code destino}.
	 * Nunca é permitido "transitar" para o próprio estado atual.
	 */
	public boolean podeTransitarPara(EstadoFDS destino) {
		return TRANSICOES_VALIDAS.getOrDefault(this, Set.of()).contains(destino);
	}

	/**
	 * @return o próprio {@code destino}, para permitir encadeamento fluente
	 * (ex.: {@code this.estado = this.estado.transicionarPara(EstadoFDS.OBSOLETA)}).
	 * @throws TransicaoEstadoInvalidaException se a transição não for permitida.
	 */
	public EstadoFDS transicionarPara(EstadoFDS destino) {
		if (!podeTransitarPara(destino)) {
			throw new TransicaoEstadoInvalidaException(this, destino);
		}
		return destino;
	}

	/**
	 * Converte a partir de uma {@code String} vinda de fora do sistema (ex.:
	 * um {@code query param} HTTP) — nunca use {@link #valueOf(String)}
	 * diretamente para dados de entrada do cliente (Fase 5, Parte 3): essa
	 * chamada lançaria {@link IllegalArgumentException}, que não é apanhada
	 * por nenhum {@code @ExceptionHandler} e resultaria num 500 para o que é
	 * um erro do cliente (um valor de estado desconhecido no URL).
	 *
	 * <p>{@link #valueOf(String)} continua a ser o método certo para os
	 * pontos que leem um valor já persistido na base de dados (ex.:
	 * {@code FDSEntityMapper}, {@code FDSAuditoriaEntityMapper}) — um valor
	 * inválido nesses pontos é um problema de integridade de dados do
	 * servidor, não um erro do cliente, e deve continuar a resultar em 500.</p>
	 *
	 * @throws IdentificadorInvalidoException se {@code valor} não corresponder
	 * a nenhuma constante deste enum.
	 */
	public static EstadoFDS de(String valor) {
		try {
			return EstadoFDS.valueOf(valor);
		} catch (IllegalArgumentException e) {
			throw new IdentificadorInvalidoException("Estado de FDS", valor);
		}
	}
}
