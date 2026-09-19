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
 * Testes de integração do endpoint {@code /tickets}, ponta a ponta — o
 * fluxo completo de abrir um ticket e voltar a obtê-lo, mais os mesmos
 * cenários de erro do cliente já cobertos para {@code /fds}
 * ({@link FDSControllerIT}) mas nunca antes exercidos ao nível do HTTP para
 * Ticket. {@link AutorizacaoIT} já cobre a fronteira RBAC
 * (403 para fds-operador); esta classe cobre o resto do ciclo de vida.
 *
 * <p><b>Regressão da Fase 5, Parte 3</b>: {@link #abrirComFornecedorIdMalFormadoDeveDevolver400()}
 * exercita, pela primeira vez ao nível de IT, a mesma correção que
 * {@code FDSControllerIT} já cobre para {@code /fds} — um {@code fornecedorId}
 * que não é um UUID válido tem de resultar em 400 (via
 * {@code IdentificadorInvalidoException}), nunca num 500.</p>
 *
 * <p><b>Nota de honestidade</b>: escrito com cuidado, mas nunca executado —
 * ver {@link FDSControllerIT} para a mesma ressalva.</p>
 */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
class TicketControllerIT {

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

	@Test
	void abrirSemTokenDeveDevolver401() throws Exception {
		mockMvc.perform(post("/tickets")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{}"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void abrirComFornecedorInexistenteDeveDevolver404() throws Exception {
		String corpo = """
				{ "fdsId": null, "fornecedorId": "%s", "mensagemInicial": null, "autorMensagemInicial": null }
				""".formatted(UUID.randomUUID());

		mockMvc.perform(post("/tickets")
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-GESTOR")))
						.contentType(MediaType.APPLICATION_JSON)
						.content(corpo))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value(404));
	}

	/**
	 * Fase 5, Parte 3 — {@code FornecedorId.de(...)} substitui o
	 * {@code UUID.fromString} cru; um valor que nunca chegaria sequer a ser
	 * um UUID tem de dar 400, não 500. Nunca antes testado para
	 * {@code AbrirTicketUseCase} ao nível de IT.
	 */
	@Test
	void abrirComFornecedorIdMalFormadoDeveDevolver400() throws Exception {
		String corpo = """
				{ "fdsId": null, "fornecedorId": "isto-nao-e-um-uuid", "mensagemInicial": null, "autorMensagemInicial": null }
				""";

		mockMvc.perform(post("/tickets")
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-GESTOR")))
						.contentType(MediaType.APPLICATION_JSON)
						.content(corpo))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.mensagem").value(org.hamcrest.Matchers.containsString("isto-nao-e-um-uuid")));
	}

	/** Mesma correção, agora para o {@code fdsId} opcional. */
	@Test
	void abrirComFdsIdMalFormadoDeveDevolver400() throws Exception {
		String fornecedorId = criarFornecedorDeTesteEDevolverId();
		String corpo = """
				{ "fdsId": "isto-tambem-nao-e-um-uuid", "fornecedorId": "%s", "mensagemInicial": null, "autorMensagemInicial": null }
				""".formatted(fornecedorId);

		mockMvc.perform(post("/tickets")
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-GESTOR")))
						.contentType(MediaType.APPLICATION_JSON)
						.content(corpo))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400));
	}

	@Test
	void abrirEDepoisObterDeveDevolverOMesmoTicket() throws Exception {
		String fornecedorId = criarFornecedorDeTesteEDevolverId();
		String corpo = """
				{ "fdsId": null, "fornecedorId": "%s", "mensagemInicial": "Por favor enviem a FDS.", \
				"autorMensagemInicial": "gestor.dev" }
				""".formatted(fornecedorId);

		MvcResult criacao = mockMvc.perform(post("/tickets")
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-GESTOR")))
						.contentType(MediaType.APPLICATION_JSON)
						.content(corpo))
				.andExpect(status().isCreated())
				.andReturn();
		String idCriado = objectMapper.readTree(criacao.getResponse().getContentAsString()).get("id").asText();

		mockMvc.perform(get("/tickets/" + idCriado)
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-GESTOR"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(idCriado))
				.andExpect(jsonPath("$.fornecedorId").value(fornecedorId))
				.andExpect(jsonPath("$.estado").value("ABERTO"))
				.andExpect(jsonPath("$.mensagens[0].autor").value("gestor.dev"));
	}

	@Test
	void obterInexistenteDeveDevolver404() throws Exception {
		mockMvc.perform(get("/tickets/" + UUID.randomUUID())
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-GESTOR"))))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value(404));
	}

	@Test
	void obterComIdMalFormadoDeveDevolver400() throws Exception {
		mockMvc.perform(get("/tickets/isto-nao-e-um-uuid")
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-GESTOR"))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400));
	}

	/** Cria um fornecedor mínimo (papel gestor, sempre permitido) e devolve o id da resposta. */
	private String criarFornecedorDeTesteEDevolverId() throws Exception {
		String corpo = """
				{ "nome": "Fornecedor de Teste (Tickets)", "email": "fornecedor.tickets@teste.pt", "contactos": [] }
				""";

		MvcResult resultado = mockMvc.perform(post("/fornecedores")
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-GESTOR")))
						.contentType(MediaType.APPLICATION_JSON)
						.content(corpo))
				.andExpect(status().isCreated())
				.andReturn();

		return objectMapper.readTree(resultado.getResponse().getContentAsString()).get("id").asText();
	}
}
