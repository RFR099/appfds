package com.dstgroup.fds;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPublicKey;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

/**
 * Substitui o {@link JwtDecoder} autoconfigurado (que iria contactar o
 * {@code issuer-uri} real do Keycloak) por um decoder baseado numa chave RSA
 * gerada localmente. Assim, os testes de contexto não dependem de um Keycloak
 * a correr nem de acesso à rede — apenas confirmam que a aplicação arranca e
 * que a cadeia de segurança está bem configurada.
 *
 * <p>Testes que precisem de simular um utilizador autenticado devem gerar um
 * JWT assinado com a mesma chave privada, ou usar
 * {@code @WithMockUser}/{@code SecurityMockMvcRequestPostProcessors.jwt()}.</p>
 */
@TestConfiguration
public class TestSecurityConfig {

	@Bean
	public JwtDecoder jwtDecoder() throws Exception {
		KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
		generator.initialize(2048);
		KeyPair keyPair = generator.generateKeyPair();
		return NimbusJwtDecoder.withPublicKey((RSAPublicKey) keyPair.getPublic()).build();
	}
}
