package com.dstgroup.fds.presentation;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
import org.springframework.mock.web.MockMultipartFile;
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
 * Testes de integração do endpoint {@code /fds}, ponta a ponta (HTTP ->
 * Application -> Domain -> JPA -> PostgreSQL real via Testcontainers).
 *
 * <p>Autenticação simulada com {@code SecurityMockMvcRequestPostProcessors.jwt()}
 * — injeta um principal JWT autenticado diretamente no contexto de segurança
 * do pedido de teste, sem precisar de um Keycloak real nem de validar
 * assinatura (esse comportamento já está coberto, à parte, pela configuração
 * real em produção).</p>
 *
 * <p><b>RBAC (Fase 5, Parte 1)</b>: {@code jwt()} sozinho não carrega nenhum
 * papel do realm — por isso os testes que esperam sucesso (2xx) passaram a
 * anexar {@code .authorities(...)} com o papel mínimo exigido pelo endpoint
 * ({@code @PermiteGestao}/{@code @PermiteConsulta} em {@link FDSController}).
 * {@link #criarComPapelOperadorDeveDevolver403()} e
 * {@link #obterComPapelOperadorDeveDevolver200()} testam a fronteira dessa
 * regra diretamente.</p>
 *
 * <p><b>Tratamento de erros (Fase 5, Parte 3)</b>: {@link #obterComIdMalFormadoDeveDevolver400ENaoQuinhentos()},
 * {@link #listarComEstadoInvalidoDeveDevolver400()},
 * {@link #listarComPaginaNaoNumericaDeveDevolver400ComFormatoConsistente()} e
 * {@link #criarComJsonMalformadoDeveDevolver400ComFormatoConsistente()} testam,
 * ponta a ponta pelo HTTP, as lacunas fechadas nessa parte — casos que antes
 * resultavam num 500 (ou num corpo de erro inconsistente) para o que são,
 * claramente, erros do cliente.</p>
 *
 * <p><b>Auditoria (Fase 5, Parte 2 e 4)</b>: {@link #auditoriaSemTokenDeveDevolver401()},
 * {@link #auditoriaDeFDSExistenteSemTransicoesDevolveListaVazia()} e
 * {@link #auditoriaDeFDSInexistenteDeveDevolver404()} são a primeira cobertura de
 * integração de {@code GET /fds/{id}/auditoria} — existia desde a Parte 2, mas
 * nunca tinha sido exercitada ponta a ponta pelo HTTP.</p>
 *
 * <p><b>Nota de honestidade</b>: escrito com cuidado, mas nunca executado —
 * ver {@link FDSRepositoryAdapterIT} para a mesma ressalva.</p>
 */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
class FDSControllerIT {

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
	void criarSemTokenDeveDevolver401() throws Exception {
		mockMvc.perform(post("/fds")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{}"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void criarComTokenValidoDeveDevolver201() throws Exception {
		String corpo = """
				{
				  "nomeProdutoQuimico": "SprayMount",
				  "marca": "3M",
				  "fornecedorId": null,
				  "emailContacto": null,
				  "dataRevisao": null,
				  "dataValidade": null,
				  "pictogramas": [],
				  "obrasIds": []
				}
				""";

		mockMvc.perform(post("/fds")
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-GESTOR")))
						.contentType(MediaType.APPLICATION_JSON)
						.content(corpo))
				.andExpect(status().isCreated());
	}

	@Test
	void obterInexistenteComTokenValidoDeveDevolver404() throws Exception {
		mockMvc.perform(get("/fds/" + UUID.randomUUID())
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-GESTOR"))))
				.andExpect(status().isNotFound());
	}

	/**
	 * fds-operador só pode consultar (RBAC, Fase 5 Parte 1) — tentar criar
	 * deve ser barrado pelo {@code @PreAuthorize} antes de chegar ao caso de
	 * uso, com o corpo de erro consistente do {@code GlobalExceptionHandler}.
	 */
	@Test
	void criarComPapelOperadorDeveDevolver403() throws Exception {
		String corpo = """
				{
				  "nomeProdutoQuimico": "SprayMount",
				  "marca": "3M",
				  "fornecedorId": null,
				  "emailContacto": null,
				  "dataRevisao": null,
				  "dataValidade": null,
				  "pictogramas": [],
				  "obrasIds": []
				}
				""";

		mockMvc.perform(post("/fds")
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-OPERADOR")))
						.contentType(MediaType.APPLICATION_JSON)
						.content(corpo))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.status").value(403));
	}

	/**
	 * O outro lado da mesma fronteira: fds-operador tem de conseguir
	 * consultar, mesmo não podendo escrever — {@code @PermiteConsulta}
	 * inclui os três papéis.
	 */
	@Test
	void obterComPapelOperadorDeveDevolver200() throws Exception {
		String idCriada = criarFDSDeTesteEDevolverId();

		mockMvc.perform(get("/fds/" + idCriada)
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-OPERADOR"))))
				.andExpect(status().isOk());
	}

	@Test
	void listarSemTokenDeveDevolver401() throws Exception {
		mockMvc.perform(get("/fds"))
				.andExpect(status().isUnauthorized());
	}

	/**
	 * Fase 5, Parte 3 — antes desta parte, um id mal formado no URL
	 * (que nunca é sequer um UUID) propagava uma {@code IllegalArgumentException}
	 * crua de {@code UUID.fromString}, não apanhada por nenhum
	 * {@code @ExceptionHandler}, resultando num 500 Internal Server Error
	 * para o que é claramente um erro do cliente. Agora {@code FDSId.de(...)}
	 * lança {@code IdentificadorInvalidoException} (uma {@code DomainException}),
	 * já apanhada pelo handler genérico, com o mesmo formato de erro do resto
	 * da API.
	 */
	@Test
	void obterComIdMalFormadoDeveDevolver400ENaoQuinhentos() throws Exception {
		mockMvc.perform(get("/fds/isto-nao-e-um-uuid")
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-OPERADOR"))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.mensagem").value(org.hamcrest.Matchers.containsString("isto-nao-e-um-uuid")));
	}

	/**
	 * Mesma lacuna fechada na Fase 5, Parte 3, mas para um valor de enum
	 * ({@code estado}) desconhecido num query param — {@code EstadoFDS.de(...)}
	 * substitui o {@code EstadoFDS.valueOf(...)} cru só neste ponto de
	 * entrada vindo do cliente.
	 */
	@Test
	void listarComEstadoInvalidoDeveDevolver400() throws Exception {
		mockMvc.perform(get("/fds").param("estado", "NAO_EXISTE")
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-OPERADOR"))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400));
	}

	/**
	 * Um {@code query param} com o tipo errado (aqui, {@code pagina} não
	 * numérico) é resolvido pelo próprio Spring MVC antes de chegar ao
	 * corpo do método — o novo handler de
	 * {@code MethodArgumentTypeMismatchException} (Fase 5, Parte 3) garante
	 * que o corpo da resposta continua no mesmo formato consistente, em vez
	 * da página de erro genérica do Spring Boot.
	 */
	@Test
	void listarComPaginaNaoNumericaDeveDevolver400ComFormatoConsistente() throws Exception {
		mockMvc.perform(get("/fds").param("pagina", "abc")
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-OPERADOR"))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.mensagem").value(org.hamcrest.Matchers.containsString("pagina")));
	}

	/**
	 * JSON malformado no corpo do pedido — antes da Fase 5, Parte 3, isto
	 * caía na página de erro genérica do Spring Boot (formato diferente do
	 * resto da API). O novo handler de {@code HttpMessageNotReadableException}
	 * garante 400 com o mesmo formato, e nunca expõe a mensagem técnica
	 * (verbosa, em inglês) do Jackson ao cliente.
	 */
	@Test
	void criarComJsonMalformadoDeveDevolver400ComFormatoConsistente() throws Exception {
		mockMvc.perform(post("/fds")
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-GESTOR")))
						.contentType(MediaType.APPLICATION_JSON)
						.content("{ isto não é json válido"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.mensagem").value(
						"O corpo do pedido é inválido ou não pôde ser interpretado."));
	}

	@Test
	void atualizarSemTokenDeveDevolver401() throws Exception {
		mockMvc.perform(patch("/fds/" + UUID.randomUUID())
						.contentType(MediaType.APPLICATION_JSON)
						.content("{}"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void atualizarFDSExistenteDeveAplicarAlteracaoEDevolver200() throws Exception {
		String idCriada = criarFDSDeTesteEDevolverId();

		String corpoAtualizacao = """
				{ "marca": "A2Brios" }
				""";

		mockMvc.perform(patch("/fds/" + idCriada)
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-GESTOR")))
						.contentType(MediaType.APPLICATION_JSON)
						.content(corpoAtualizacao))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.marca").value("A2Brios"));
	}

	@Test
	void adicionarImagemSemTokenDeveDevolver401() throws Exception {
		MockMultipartFile ficheiro = new MockMultipartFile("ficheiro", "foto.png", "image/png", new byte[10]);

		mockMvc.perform(multipart("/fds/" + UUID.randomUUID() + "/imagem").file(ficheiro))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void adicionarImagemDeveAssociarImagemEDevolver200() throws Exception {
		String idCriada = criarFDSDeTesteEDevolverId();
		MockMultipartFile ficheiro = new MockMultipartFile("ficheiro", "foto.png", "image/png", new byte[1024]);

		mockMvc.perform(multipart("/fds/" + idCriada + "/imagem")
						.file(ficheiro)
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-GESTOR"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.imagemTipoMime").value("image/png"))
				.andExpect(jsonPath("$.imagemCaminho").isNotEmpty());
	}

	@Test
	void auditoriaSemTokenDeveDevolver401() throws Exception {
		mockMvc.perform(get("/fds/" + UUID.randomUUID() + "/auditoria"))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void auditoriaDeFDSExistenteSemTransicoesDevolveListaVazia() throws Exception {
		String idCriada = criarFDSDeTesteEDevolverId();

		mockMvc.perform(get("/fds/" + idCriada + "/auditoria")
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-GESTOR"))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$").isArray())
				.andExpect(jsonPath("$").isEmpty());
	}

	@Test
	void auditoriaDeFDSInexistenteDeveDevolver404() throws Exception {
		mockMvc.perform(get("/fds/" + UUID.randomUUID() + "/auditoria")
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-GESTOR"))))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value(404));
	}

	/**
	 * Regressão da Parte 3, nunca antes testada para este endpoint em concreto:
	 * {@code ObterHistoricoAuditoriaUseCase} usa {@code FDSId.de(...)} desde a
	 * Parte 3, mas nenhum teste de integração tinha exercitado
	 * {@code /fds/{id}/auditoria} com um id malformado.
	 */
	@Test
	void auditoriaComIdMalFormadoDeveDevolver400() throws Exception {
		mockMvc.perform(get("/fds/isto-nao-e-um-uuid/auditoria")
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-GESTOR"))))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400));
	}

	/** Cria uma FDS mínima e devolve o id da resposta, para os testes que precisam de uma FDS real. */
	private String criarFDSDeTesteEDevolverId() throws Exception {
		String corpo = """
				{
				  "nomeProdutoQuimico": "Produto de Teste",
				  "marca": "3M",
				  "fornecedorId": null,
				  "emailContacto": null,
				  "dataRevisao": null,
				  "dataValidade": null,
				  "pictogramas": [],
				  "obrasIds": []
				}
				""";

		MvcResult resultado = mockMvc.perform(post("/fds")
						.with(jwt().authorities(new SimpleGrantedAuthority("ROLE_FDS-GESTOR")))
						.contentType(MediaType.APPLICATION_JSON)
						.content(corpo))
				.andExpect(status().isCreated())
				.andReturn();

		return objectMapper.readTree(resultado.getResponse().getContentAsString()).get("id").asText();
	}
}
