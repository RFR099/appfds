package com.dstgroup.fds;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Confirma que o contexto Spring arranca com sucesso: Flyway corre contra um
 * PostgreSQL real (Testcontainers) e a configuração de segurança é válida.
 *
 * <p>Não depende de um Keycloak real a correr — o {@code issuer-uri} aponta
 * para um valor de teste; este teste apenas garante o "fio elétrico" da
 * aplicação, não o fluxo de autenticação completo (esse é validado com
 * {@code @WebMvcTest} + mock JWT quando existirem endpoints de negócio).</p>
 */
@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
class FdsBackendApplicationTests {

	@Container
	static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
			.withDatabaseName("fds")
			.withUsername("fds")
			.withPassword("fds");

	@DynamicPropertySource
	static void propriedadesDaBaseDeDados(DynamicPropertyRegistry registry) {
		registry.add("spring.datasource.url", postgres::getJdbcUrl);
		registry.add("spring.datasource.username", postgres::getUsername);
		registry.add("spring.datasource.password", postgres::getPassword);
		// issuer-uri não é usado nos testes: o JwtDecoder é substituído por
		// TestSecurityConfig, que não contacta nenhum Keycloak real.
	}

	@Test
	void contextoDeveArrancarComSucesso() {
		// Se o contexto Spring não arrancar (ex.: erro de configuração,
		// migração Flyway falhada), este teste falha automaticamente.
	}
}
