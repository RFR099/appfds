package com.dstgroup.fds.infrastructure.config;

import java.util.List;

import com.dstgroup.fds.infrastructure.security.KeycloakRealmRoleConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Backend como <b>OAuth2 Resource Server</b>: não gere sessões nem passwords —
 * apenas valida o JWT emitido pelo Keycloak (assinatura, issuer, expiração) e
 * mapeia os roles do realm para autoridades Spring Security.
 *
 * <p>O {@link JwtDecoder} é autoconfigurado pelo Spring Boot a partir de
 * {@code spring.security.oauth2.resourceserver.jwt.issuer-uri} (ver
 * application.yml), que vai buscar as chaves públicas (JWKS) ao Keycloak.</p>
 *
 * <p>{@link EnableMethodSecurity} (Fase 5, Parte 1) liga o
 * {@code @PreAuthorize} usado nos controllers via
 * {@code PermiteConsulta}/{@code PermiteGestao}/{@code PermiteAdmin} — até
 * aqui só havia autenticação (qualquer JWT válido passava), nenhuma
 * autorização por papel.</p>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

	// Origens do frontend (SPA React, Fase 6) autorizadas a chamar esta API
	// diretamente do browser — sem isto, o pedido nem chega ao Spring
	// Security: o browser bloqueia-o por CORS antes de o enviar. Por omissão,
	// a mesma origem já usada pelo client "fds-frontend" no Keycloak
	// (redirectUris/webOrigins em keycloak/realm-fds.json).
	@Value("${app.cors.allowed-origins:http://localhost:5173}")
	private List<String> allowedOrigins;

	@Bean
	public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
		http
			.csrf(AbstractHttpConfigurer::disable) // API stateless consumida por SPA com Bearer token
			.cors(cors -> cors.configurationSource(corsConfigurationSource()))
			.sessionManagement(session -> session
					.sessionCreationPolicy(org.springframework.security.config.http.SessionCreationPolicy.STATELESS))
			.authorizeHttpRequests(auth -> auth
					.requestMatchers("/actuator/health/**").permitAll()
					// Documentação da API (Fase 5, Parte 5) — expõe só a forma do
					// contrato (rotas, DTOs, códigos de erro possíveis), nunca dados
					// reais; ver a "Decisão de âmbito" em OpenApiConfig para a
					// justificação completa e a ressalva sobre deployments públicos.
					.requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
					.anyRequest().authenticated())
			.oauth2ResourceServer(oauth2 -> oauth2
					.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));
		return http.build();
	}

	@Bean
	public KeycloakRealmRoleConverter jwtAuthenticationConverter() {
		return new KeycloakRealmRoleConverter();
	}

	private CorsConfigurationSource corsConfigurationSource() {
		CorsConfiguration configuration = new CorsConfiguration();
		configuration.setAllowedOrigins(allowedOrigins);
		configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
		configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
		// Bearer token no header Authorization, nunca cookies — não há sessão
		// nem estado partilhado entre browser e backend para proteger aqui.
		configuration.setAllowCredentials(false);

		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", configuration);
		return source;
	}
}
