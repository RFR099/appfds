package com.dstgroup.fds.presentation;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import com.dstgroup.fds.TestSecurityConfig;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Testes de integração de autorização por papel (RBAC — Fase 5, Parte 1),
 * cobrindo os controllers que {@link FDSControllerIT} não cobre: Ticket
 * (gestão, nunca operador), Centro Produtivo e Obra (criar é exclusivo de
 * fds-admin, diferente de FDS/Fornecedor) e Alertas (gestão).
 *
 * <p>Não repete exaustivamente cada endpoint de cada controller — só a
 * fronteira de cada regra distinta introduzida pela matriz de permissões
 * (ver {@code PermiteConsulta}/{@code PermiteGestao}/{@code PermiteAdmin}),
 * que é onde um erro de scoping seria mais provável.</p>
 *
 * <p><b>Nota de honestidade</b>: escrito com cuidado, mas nunca executado —
 * ver {@link FDSControllerIT} para a mesma ressalva (sandbox sem acesso ao
 * Maven Central).</p>
 */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
class AutorizacaoIT {

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

	@Autowired
	private ObjectMapper objectMapper;

	// --- Tickets: só gestor/admin, nunca operador (@PermiteGestao a nível da classe) ---

	@Test
	void abrirTicketComPapelOperadorDeveDevolver403() throws Exception {
		mockMvc.perform(post("/tickets")
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-OPERADOR")))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{}"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.status").value(403));
	}

	@Test
	void abrirTicketComPapelGestorEFornecedorValidoDeveDevolver201() throws Exception {
		String fornecedorId = criarFornecedorDeTesteEDevolverId();
		String corpo = """
				{ "fdsId": null, "fornecedorId": "%s", "mensagemInicial": null, "autorMensagemInicial": null }
				""".formatted(fornecedorId);

		mockMvc.perform(post("/tickets")
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-GESTOR")))
						.contentType(MediaType.APPLICATION_JSON)
						.content(corpo))
				.andExpect(status().isCreated());
	}

	// --- Centro Produtivo: criar é exclusivo de fds-admin (diferente de Fornecedor) ---

	@Test
	void criarCentroProdutivoComPapelGestorDeveDevolver403() throws Exception {
		String corpo = """
				{ "nome": "Fábrica Norte", "localizacao": "Braga" }
				""";

		mockMvc.perform(post("/centros-produtivos")
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-GESTOR")))
						.contentType(MediaType.APPLICATION_JSON)
						.content(corpo))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.status").value(403));
	}

	@Test
	void criarCentroProdutivoComPapelAdminDeveDevolver201() throws Exception {
		String corpo = """
				{ "nome": "Fábrica Sul", "localizacao": "Faro" }
				""";

		mockMvc.perform(post("/centros-produtivos")
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-ADMIN")))
						.contentType(MediaType.APPLICATION_JSON)
						.content(corpo))
				.andExpect(status().isCreated());
	}

	// --- Obra: criar é exclusivo de fds-admin, tal como Centro Produtivo — nunca antes testado ---

	@Test
	void criarObraComPapelGestorDeveDevolver403() throws Exception {
		String corpo = """
				{ "nome": "Obra Marginal", "centroProdutivoId": "%s" }
				""".formatted(UUID.randomUUID());

		mockMvc.perform(post("/obras")
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-GESTOR")))
						.contentType(MediaType.APPLICATION_JSON)
						.content(corpo))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.status").value(403));
	}

	@Test
	void criarObraComPapelAdminDeveDevolver201() throws Exception {
		String centroProdutivoId = criarCentroProdutivoDeTesteEDevolverId();
		String corpo = """
				{ "nome": "Obra Marginal", "centroProdutivoId": "%s" }
				""".formatted(centroProdutivoId);

		mockMvc.perform(post("/obras")
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-ADMIN")))
						.contentType(MediaType.APPLICATION_JSON)
						.content(corpo))
				.andExpect(status().isCreated());
	}

	@Test
	void obterObraComPapelOperadorDeveDevolver404ParaIdInexistente() throws Exception {
		// PermiteConsulta inclui fds-operador — 404 (não 403) confirma que a
		// autorização deixou passar e foi o caso de uso que corretamente não
		// encontrou a obra.
		mockMvc.perform(get("/obras/" + UUID.randomUUID())
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-OPERADOR"))))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value(404));
	}

	// --- Alertas: só gestor/admin, nunca operador (@PermiteGestao a nível da classe) ---

	@Test
	void obterAlertasComPapelOperadorDeveDevolver403() throws Exception {
		mockMvc.perform(get("/alertas")
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-OPERADOR"))))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.status").value(403));
	}

	@Test
	void obterAlertasComPapelGestorDeveDevolver200() throws Exception {
		mockMvc.perform(get("/alertas")
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-GESTOR"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.total").isNumber());
	}

	/** Cria um fornecedor mínimo (papel admin, sempre permitido) e devolve o id da resposta. */
	private String criarFornecedorDeTesteEDevolverId() throws Exception {
		String corpo = """
				{ "nome": "Fornecedor de Teste", "email": "fornecedor@teste.pt", "contactos": [] }
				""";

		MvcResult resultado = mockMvc.perform(post("/fornecedores")
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-ADMIN")))
						.contentType(MediaType.APPLICATION_JSON)
						.content(corpo))
				.andExpect(status().isCreated())
				.andReturn();

		return objectMapper.readTree(resultado.getResponse().getContentAsString()).get("id").asText();
	}

	/** Cria um centro produtivo mínimo (papel admin) e devolve o id da resposta. */
	private String criarCentroProdutivoDeTesteEDevolverId() throws Exception {
		String corpo = """
				{ "nome": "Fábrica de Teste", "localizacao": "Porto" }
				""";

		MvcResult resultado = mockMvc.perform(post("/centros-produtivos")
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-ADMIN")))
						.contentType(MediaType.APPLICATION_JSON)
						.content(corpo))
				.andExpect(status().isCreated())
				.andReturn();

		return objectMapper.readTree(resultado.getResponse().getContentAsString()).get("id").asText();
	}
}
