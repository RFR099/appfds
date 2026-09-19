package com.dstgroup.fds.infrastructure.security;

import java.util.Optional;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import com.dstgroup.fds.application.port.out.AutenticacaoPort;

/**
 * Adapter de infraestrutura: lê o utilizador autenticado do
 * {@link SecurityContextHolder} do Spring Security (Fase 5, Parte 2).
 *
 * <p>Não lê o JWT diretamente — {@code Authentication#getName()} já devolve
 * o nome resolvido por {@link KeycloakRealmRoleConverter} ao construir o
 * {@code JwtAuthenticationToken} (preferred_username, com fallback para o
 * subject), evitando duplicar essa lógica aqui.</p>
 *
 * <p>{@code SecurityContextHolder} usa por omissão uma estratégia
 * {@code ThreadLocal}: numa execução sem pedido HTTP autenticado (ex.: o job
 * agendado {@code MarcarFDSObsoletasUseCase}, que corre na thread do
 * scheduler do Spring, não na thread de um pedido) o contexto está vazio, e
 * este adapter devolve corretamente {@link Optional#empty()} — não é um
 * caso de erro a tratar.</p>
 */
@Component
public class SpringSecurityAutenticacaoAdapter implements AutenticacaoPort {

	@Override
	public Optional<String> utilizadorAtual() {
		Authentication autenticacao = SecurityContextHolder.getContext().getAuthentication();
		if (autenticacao == null || !autenticacao.isAuthenticated()) {
			return Optional.empty();
		}
		return Optional.ofNullable(autenticacao.getName());
	}
}
