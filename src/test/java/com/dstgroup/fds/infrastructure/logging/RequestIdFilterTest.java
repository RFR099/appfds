package com.dstgroup.fds.infrastructure.logging;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/**
 * Testa apenas {@link RequestIdFilter#resolveRequestId(String)} — a única
 * parte deste filtro que não depende da Servlet API nem do MDC do SLF4J, e
 * por isso a única testável sem uma biblioteca de mocking (indisponível
 * nesta sandbox). O comportamento do {@code doFilterInternal} em si
 * (ler o cabeçalho do {@code HttpServletRequest}, escrever no MDC, repor no
 * {@code finally}) não tem cobertura de teste executável aqui — ficaria a
 * cargo de um {@code MockMvc}/{@code @WebMvcTest} num ambiente com acesso ao
 * Maven Central.
 */
class RequestIdFilterTest {

	@Test
	void reaproveitaCabecalhoQuandoPresente() {
		String resultado = RequestIdFilter.resolveRequestId("abc-123-vindo-do-gateway");

		assertThat(resultado).isEqualTo("abc-123-vindo-do-gateway");
	}

	@Test
	void geraNovoIdQuandoCabecalhoAusente() {
		String resultado = RequestIdFilter.resolveRequestId(null);

		assertThat(resultado).isNotBlank();
	}

	@Test
	void geraNovoIdQuandoCabecalhoEmBranco() {
		String resultado = RequestIdFilter.resolveRequestId("   ");

		assertThat(resultado).isNotBlank().isNotEqualTo("   ");
	}

	@Test
	void doisIdsGeradosAutomaticamenteSaoDiferentes() {
		String primeiro = RequestIdFilter.resolveRequestId(null);
		String segundo = RequestIdFilter.resolveRequestId(null);

		assertThat(primeiro).isNotEqualTo(segundo);
	}
}
