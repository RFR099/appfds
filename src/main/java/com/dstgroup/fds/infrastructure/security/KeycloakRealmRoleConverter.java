package com.dstgroup.fds.infrastructure.security;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;

/**
 * Adapter de infraestrutura: traduz o formato específico do token do Keycloak
 * (claim {@code realm_access.roles}) para {@link GrantedAuthority} do Spring Security.
 *
 * <p>Isola o resto da aplicação (application/domain) do formato concreto do
 * token — se amanhã se trocar de Identity Provider, só este adapter muda.</p>
 *
 * <p>Roles do realm (ex.: {@code fds-admin}) são expostas como
 * {@code ROLE_FDS-ADMIN}, seguindo a convenção do Spring Security para
 * {@code hasRole(...)}.</p>
 */
public class KeycloakRealmRoleConverter implements Converter<Jwt, AbstractAuthenticationToken> {

	private static final String REALM_ACCESS_CLAIM = "realm_access";
	private static final String ROLES_CLAIM = "roles";
	private static final String ROLE_PREFIX = "ROLE_";

	private final JwtGrantedAuthoritiesConverter defaultScopesConverter = new JwtGrantedAuthoritiesConverter();

	@Override
	public AbstractAuthenticationToken convert(Jwt jwt) {
		Collection<GrantedAuthority> authorities = extraiRealmRoles(jwt);
		authorities.addAll(defaultScopesConverter.convert(jwt));
		return new JwtAuthenticationToken(jwt, authorities, extraiUsername(jwt));
	}

	@SuppressWarnings("unchecked")
	private Collection<GrantedAuthority> extraiRealmRoles(Jwt jwt) {
		Map<String, Object> realmAccess = jwt.getClaim(REALM_ACCESS_CLAIM);
		if (realmAccess == null || realmAccess.get(ROLES_CLAIM) == null) {
			return new java.util.ArrayList<>();
		}
		List<String> roles = (List<String>) realmAccess.get(ROLES_CLAIM);
		return roles.stream()
				.map(role -> (GrantedAuthority) new SimpleGrantedAuthority(ROLE_PREFIX + role.toUpperCase()))
				.collect(Collectors.toCollection(java.util.ArrayList::new));
	}

	private String extraiUsername(Jwt jwt) {
		String preferredUsername = jwt.getClaimAsString("preferred_username");
		return preferredUsername != null ? preferredUsername : jwt.getSubject();
	}
}
