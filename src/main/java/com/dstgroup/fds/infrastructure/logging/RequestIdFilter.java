package com.dstgroup.fds.infrastructure.logging;

import java.io.IOException;
import java.util.UUID;

import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Filtro Servlet (Fase 5, Parte 4 — observabilidade) que atribui um
 * identificador de correlação a cada pedido HTTP, para juntar todas as
 * linhas de log de um mesmo pedido (mesmo entre threads assíncronas do
 * mesmo request) — essencial para depurar produção, onde vários pedidos se
 * intercalam no mesmo output de log.
 *
 * <ul>
 *   <li>Se o cliente (ou um API gateway/load balancer a montante) já enviar o
 *   cabeçalho {@code X-Request-Id}, esse valor é reaproveitado — permite
 *   seguir um pedido através de múltiplos serviços com o mesmo id.</li>
 *   <li>Caso contrário, gera-se um {@link UUID} novo.</li>
 * </ul>
 *
 * <p>O id é colocado no SLF4J {@link MDC} sob a chave {@code requestId},
 * consultável no padrão de log via {@code %X{requestId}} (ver
 * {@code application.yml}, propriedade {@code logging.pattern.console}), e
 * devolvido também no cabeçalho de resposta, para o chamador poder citá-lo
 * ao reportar um problema.</p>
 *
 * <p>{@code @Component} é suficiente para o Spring Boot registar este filtro
 * automaticamente na cadeia Servlet — não é necessário nenhum
 * {@code FilterRegistrationBean} explícito.</p>
 *
 * <p><b>Nota de verificação:</b> ao contrário do resto do código nesta
 * Parte, a lógica de decisão do id (reaproveitar vs. gerar) foi
 * deliberadamente extraída para {@link #resolveRequestId(String)}, um
 * método estático que recebe só o valor (já lido) do cabeçalho — uma
 * função pura, sem nenhum tipo da Servlet API — precisamente para poder
 * ser testada sem depender de uma biblioteca de mocking (Mockito não está
 * disponível nesta sandbox). O resto do filtro ({@code doFilterInternal})
 * continua por natureza acoplado à Servlet API e ao MDC, tal como qualquer
 * outro código desta camada de Infrastructure.</p>
 */
@Component
public class RequestIdFilter extends OncePerRequestFilter {

	static final String CABECALHO_REQUEST_ID = "X-Request-Id";
	static final String CHAVE_MDC = "requestId";

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
			FilterChain filterChain) throws ServletException, IOException {
		String requestId = resolveRequestId(request.getHeader(CABECALHO_REQUEST_ID));
		MDC.put(CHAVE_MDC, requestId);
		response.setHeader(CABECALHO_REQUEST_ID, requestId);
		try {
			filterChain.doFilter(request, response);
		} finally {
			// limpar sempre, mesmo em falha — threads de um pool são reutilizadas
			// e o MDC não deve "vazar" o requestId de um pedido para o seguinte.
			MDC.remove(CHAVE_MDC);
		}
	}

	static String resolveRequestId(String cabecalhoRecebido) {
		return (cabecalhoRecebido != null && !cabecalhoRecebido.isBlank())
				? cabecalhoRecebido
				: UUID.randomUUID().toString();
	}
}
