package com.dstgroup.fds.domain.ticket;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Ciclo de vida de um {@code TicketFDS}: {@code ABERTO} -> {@code RESPONDIDO}
 * -> {@code FECHADO}, com um atalho {@code ABERTO -> FECHADO} para cancelar
 * um pedido sem resposta do fornecedor. {@code FECHADO} é terminal.
 *
 * <p>Mesma técnica de {@code EstadoFDS} (Fase 1, Parte 3): a matriz de
 * transições é representada como dados, não como lógica condicional
 * dispersa.</p>
 */
public enum EstadoTicket {

	ABERTO,
	RESPONDIDO,
	FECHADO;

	private static final Map<EstadoTicket, Set<EstadoTicket>> TRANSICOES_VALIDAS = construirMatrizDeTransicoes();

	private static Map<EstadoTicket, Set<EstadoTicket>> construirMatrizDeTransicoes() {
		Map<EstadoTicket, Set<EstadoTicket>> matriz = new EnumMap<>(EstadoTicket.class);
		matriz.put(ABERTO, EnumSet.of(RESPONDIDO, FECHADO));
		matriz.put(RESPONDIDO, EnumSet.of(FECHADO));
		matriz.put(FECHADO, EnumSet.noneOf(EstadoTicket.class));
		return Map.copyOf(matriz);
	}

	public boolean podeTransitarPara(EstadoTicket destino) {
		return TRANSICOES_VALIDAS.getOrDefault(this, Set.of()).contains(destino);
	}

	public EstadoTicket transicionarPara(EstadoTicket destino) {
		if (!podeTransitarPara(destino)) {
			throw new TransicaoEstadoTicketInvalidaException(this, destino);
		}
		return destino;
	}
}
