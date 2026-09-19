package com.dstgroup.fds.domain.ticket;

import static com.dstgroup.fds.domain.ticket.EstadoTicket.ABERTO;
import static com.dstgroup.fds.domain.ticket.EstadoTicket.FECHADO;
import static com.dstgroup.fds.domain.ticket.EstadoTicket.RESPONDIDO;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class EstadoTicketTest {

	@Test
	void deveTransitarDeAbertoParaRespondido() {
		assertThat(ABERTO.podeTransitarPara(RESPONDIDO)).isTrue();
	}

	@Test
	void deveTransitarDeAbertoParaFechadoDiretamente() {
		// cancelar um ticket sem resposta do fornecedor é um cenário válido
		assertThat(ABERTO.podeTransitarPara(FECHADO)).isTrue();
	}

	@Test
	void deveTransitarDeRespondidoParaFechado() {
		assertThat(RESPONDIDO.podeTransitarPara(FECHADO)).isTrue();
	}

	@Test
	void naoDeveTransitarDeFechadoParaMaisNenhumEstado() {
		assertThat(FECHADO.podeTransitarPara(ABERTO)).isFalse();
		assertThat(FECHADO.podeTransitarPara(RESPONDIDO)).isFalse();
	}

	@Test
	void transicaoInvalidaDeveLancarExcecao() {
		assertThatThrownBy(() -> FECHADO.transicionarPara(RESPONDIDO))
				.isInstanceOf(TransicaoEstadoTicketInvalidaException.class)
				.hasMessageContaining("FECHADO")
				.hasMessageContaining("RESPONDIDO");
	}

	@ParameterizedTest(name = "{0} -> {1} deveria ser permitido = {2}")
	@MethodSource("todasAsCombinacoes")
	void matrizDeTransicoesCompleta(EstadoTicket origem, EstadoTicket destino, boolean permitido) {
		assertThat(origem.podeTransitarPara(destino)).isEqualTo(permitido);
	}

	static Stream<Arguments> todasAsCombinacoes() {
		return Stream.of(
				Arguments.of(ABERTO, ABERTO, false),
				Arguments.of(ABERTO, RESPONDIDO, true),
				Arguments.of(ABERTO, FECHADO, true),
				Arguments.of(RESPONDIDO, ABERTO, false),
				Arguments.of(RESPONDIDO, RESPONDIDO, false),
				Arguments.of(RESPONDIDO, FECHADO, true),
				Arguments.of(FECHADO, ABERTO, false),
				Arguments.of(FECHADO, RESPONDIDO, false),
				Arguments.of(FECHADO, FECHADO, false)
		);
	}
}
