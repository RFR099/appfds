package com.dstgroup.fds.infrastructure.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * Testes unitários (JUnit5 + AssertJ, sem contexto Spring) de
 * {@link KeycloakRealmRoleConverter} — escritos na Fase 5, Parte 1 (RBAC),
 * porque este converter passou a ser crítico: se falhar a extrair os roles
 * do realm, nenhum {@code @PreAuthorize}/{@code hasAnyRole(...)} tem
 * autoridade "ROLE_..." para avaliar, e tudo passaria a 403 mesmo para
 * utilizadores com o papel certo. Não tinha nenhum teste dedicado desde a
 * Fase 0 — lacuna preexistente, fechada aqui.
 *
 * <p><b>Nota de honestidade</b>: escrito com cuidado, mas nunca executado —
 * este sandbox não tem acesso ao Maven Central, logo não há jars de
 * {@code spring-security-oauth2-jose}/{@code spring-security-core} para
 * correr JUnit real aqui. Corre com {@code ./gradlew test} localmente.</p>
 */
class KeycloakRealmRoleConverterTest {

	private final KeycloakRealmRoleConverter converter = new KeycloakRealmRoleConverter();

	@Test
	void deveMapearRoleDoRealmParaAutoridadeComPrefixoRoleEMaiusculas() {
		Jwt jwt = jwtComRoles("gestor.dev", List.of("fds-gestor"));

		JwtAuthenticationToken token = (JwtAuthenticationToken) converter.convert(jwt);

		assertThat(token.getAuthorities())
				.extracting(GrantedAuthority::getAuthority)
				.contains("ROLE_FDS-GESTOR");
	}

	@Test
	void deveMapearMultiplosRoles() {
		Jwt jwt = jwtComRoles("admin.dev", List.of("fds-admin", "fds-gestor"));

		JwtAuthenticationToken token = (JwtAuthenticationToken) converter.convert(jwt);

		assertThat(token.getAuthorities())
				.extracting(GrantedAuthority::getAuthority)
				.contains("ROLE_FDS-ADMIN", "ROLE_FDS-GESTOR");
	}

	@Test
	void naoDeveGerarAutoridadesDeRealmQuandoClaimAusente() {
		Jwt jwt = jwtSemRealmAccess("sem.roles");

		JwtAuthenticationToken token = (JwtAuthenticationToken) converter.convert(jwt);

		assertThat(token.getAuthorities())
				.extracting(GrantedAuthority::getAuthority)
				.noneMatch(autoridade -> autoridade.startsWith("ROLE_"));
	}

	@Test
	void devePreservarPreferredUsernameComoNomeDoPrincipal() {
		Jwt jwt = jwtComRoles("gestor.dev", List.of("fds-gestor"));

		JwtAuthenticationToken token = (JwtAuthenticationToken) converter.convert(jwt);

		assertThat(token.getName()).isEqualTo("gestor.dev");
	}

	@Test
	void deveUsarSubjectQuandoPreferredUsernameAusente() {
		Jwt jwt = Jwt.withTokenValue("token-teste")
				.header("alg", "none")
				.subject("00000000-0000-0000-0000-000000000000")
				.claim("realm_access", Map.of("roles", List.of("fds-operador")))
				.issuedAt(Instant.parse("2026-01-01T00:00:00Z"))
				.expiresAt(Instant.parse("2026-01-01T01:00:00Z"))
				.build();

		JwtAuthenticationToken token = (JwtAuthenticationToken) converter.convert(jwt);

		assertThat(token.getName()).isEqualTo("00000000-0000-0000-0000-000000000000");
	}

	private static Jwt jwtComRoles(String preferredUsername, List<String> roles) {
		return Jwt.withTokenValue("token-teste")
				.header("alg", "none")
				.subject("subject-teste")
				.claim("preferred_username", preferredUsername)
				.claim("realm_access", Map.of("roles", roles))
				.issuedAt(Instant.parse("2026-01-01T00:00:00Z"))
				.expiresAt(Instant.parse("2026-01-01T01:00:00Z"))
				.build();
	}

	private static Jwt jwtSemRealmAccess(String preferredUsername) {
		return Jwt.withTokenValue("token-teste")
				.header("alg", "none")
				.subject("subject-teste")
				.claim("preferred_username", preferredUsername)
				.issuedAt(Instant.parse("2026-01-01T00:00:00Z"))
				.expiresAt(Instant.parse("2026-01-01T01:00:00Z"))
				.build();
	}
}
