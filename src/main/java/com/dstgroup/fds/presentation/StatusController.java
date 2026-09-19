package com.dstgroup.fds.presentation;

import java.time.Instant;
import java.util.Map;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoint de verificação: confirma que um pedido autenticado (com JWT válido
 * do Keycloak) chega à aplicação e que os roles do realm foram mapeados.
 *
 * <p>Faz parte do Definition of Done da Fase 0 — não é lógica de negócio.</p>
 */
@Tag(name = "Status", description = "Endpoint de diagnóstico da autenticação — não é lógica de negócio.")
@RestController
public class StatusController {

	@Operation(summary = "Devolve o utilizador do token JWT atual",
			description = "Qualquer papel autenticado. Usado para confirmar, num pedido real, que o "
					+ "Keycloak emitiu um token válido e que este chegou à aplicação.")
	@GetMapping("/api/status/me")
	public Map<String, Object> quemSouEu(@AuthenticationPrincipal Jwt jwt) {
		return Map.of(
				"utilizador", jwt.getClaimAsString("preferred_username"),
				"emitidoEm", Instant.ofEpochSecond(jwt.getIssuedAt().getEpochSecond()),
				"expiraEm", Instant.ofEpochSecond(jwt.getExpiresAt().getEpochSecond())
		);
	}
}
