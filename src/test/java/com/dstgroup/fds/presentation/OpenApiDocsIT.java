package com.dstgroup.fds.presentation;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import com.dstgroup.fds.TestSecurityConfig;

/**
 * Testes de integração da documentação OpenAPI (Fase 5, Parte 5) —
 * verificam que o springdoc-openapi está de facto ligado ao contexto Spring
 * e a gerar o contrato a partir das anotações dos controllers, não só que
 * o projeto compila com a dependência declarada.
 *
 * <p>{@code /v3/api-docs} e {@code /swagger-ui/**} são {@code permitAll()}
 * (ver {@code SecurityConfig}) — por isso estes testes correm sem
 * {@code jwt()}, ao contrário de todos os outros IT desta classe de testes.</p>
 *
 * <p><b>Nota de honestidade</b>: escrito com cuidado, mas nunca executado —
 * mesma ressalva de {@link FDSControllerIT} (sandbox sem acesso ao Maven
 * Central, logo sem o jar do springdoc-openapi para sequer arrancar o
 * contexto Spring aqui).</p>
 */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
class OpenApiDocsIT {

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
	}

	@Autowired
	private MockMvc mockMvc;

	@Test
	void apiDocsSemTokenDeveDevolver200() throws Exception {
		mockMvc.perform(get("/v3/api-docs"))
				.andExpect(status().isOk());
	}

	@Test
	void apiDocsDeveListarOsEndpointsPrincipais() throws Exception {
		mockMvc.perform(get("/v3/api-docs"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.paths./fds").exists())
				.andExpect(jsonPath("$.paths./tickets").exists())
				.andExpect(jsonPath("$.paths./alertas").exists())
				.andExpect(jsonPath("$.paths./fds/{id}/auditoria").exists());
	}

	@Test
	void apiDocsDeveDocumentarOEsquemaDeErroPartilhado() throws Exception {
		// Confirma que ErroResponse (Fase 5, Parte 3) ficou realmente ligado ao
		// contrato publicado — não só anotado no código-fonte.
		mockMvc.perform(get("/v3/api-docs"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.components.schemas.ErroResponse").exists())
				.andExpect(jsonPath("$.components.schemas.ErroResponse.properties.status").exists())
				.andExpect(jsonPath("$.components.schemas.ErroResponse.properties.mensagem").exists());
	}

	@Test
	void apiDocsDeveDeclararOEsquemaDeSegurancaBearer() throws Exception {
		mockMvc.perform(get("/v3/api-docs"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.components.securitySchemes.bearer-jwt.scheme").value("bearer"));
	}

	@Test
	void swaggerUiSemTokenDeveSerAcessivel() throws Exception {
		mockMvc.perform(get("/swagger-ui/index.html"))
				.andExpect(status().isOk());
	}
}
