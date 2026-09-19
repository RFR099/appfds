package com.dstgroup.fds.infrastructure.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;

/**
 * Metadados globais do OpenAPI 3 (Fase 5, Parte 5 — documentação da API),
 * servidos pelo springdoc-openapi em {@code /v3/api-docs} e apresentados
 * visualmente em {@code /swagger-ui.html}.
 *
 * <p>Declara o esquema de segurança "Bearer" (JWT do Keycloak) uma única vez
 * aqui e aplica-o como requisito global — assim o Swagger UI mostra o botão
 * "Authorize" e todos os pedidos de "try it out" já saem com o cabeçalho
 * {@code Authorization: Bearer <token>}, sem ter de o repetir em cada
 * {@code @Operation}. Isto documenta o requisito de autenticação; a
 * autorização por papel (RBAC — {@code PermiteConsulta}/{@code PermiteGestao}/
 * {@code PermiteAdmin}) continua descrita em prosa na {@code description} de
 * cada operação, porque o OpenAPI 3 não tem um conceito nativo de
 * "papel exigido" para lá de scopes OAuth2, que não é o mecanismo usado
 * aqui (é RBAC simples via roles do realm Keycloak, não scopes).</p>
 *
 * <p><b>Decisão de âmbito</b>: {@code /v3/api-docs/**} e
 * {@code /swagger-ui/**} ficam {@code permitAll()} em
 * {@link SecurityConfig} — expõem a <i>forma</i> do contrato da API (rotas,
 * DTOs, códigos de erro possíveis), nunca dados reais, seguindo o mesmo
 * precedente já aberto para {@code /actuator/health/**}. Num deployment
 * exposto diretamente à internet pública (em vez de atrás de VPN/rede
 * interna, como é o caso típico de uma API B2B como esta), valeria a pena
 * reconsiderar isto — não é uma decisão codificada em código nenhures, por
 * isso fica aqui documentada para uma revisão futura.</p>
 */
@Configuration
public class OpenApiConfig {

	private static final String ESQUEMA_BEARER = "bearer-jwt";

	@Bean
	public OpenAPI fdsOpenApi() {
		return new OpenAPI()
				.info(new Info()
						.title("dstgroup chemicals — API de Fichas de Dados de Segurança (FDS)")
						.description("""
								Gestão de Fichas de Dados de Segurança (FDS) de produtos químicos: \
								catalogação, ciclo de vida (RASCUNHO -> ATUALIZADA -> OBSOLETA), \
								pedidos a fornecedores por ticket, alertas de validade e auditoria \
								de alterações.

								Autenticação via JWT emitido pelo Keycloak (OAuth2 Resource Server) \
								— use o botão "Authorize" com um token Bearer válido. Autorização é \
								por papel do realm (fds-operador / fds-gestor / fds-admin); a \
								descrição de cada operação indica o papel mínimo exigido.

								Todos os erros seguem o mesmo formato — ver o esquema ErroResponse.""")
						.version("v1")
						.contact(new Contact().name("dstgroup chemicals")))
				.components(new Components()
						.addSecuritySchemes(ESQUEMA_BEARER, new SecurityScheme()
								.name(ESQUEMA_BEARER)
								.type(SecurityScheme.Type.HTTP)
								.scheme("bearer")
								.bearerFormat("JWT")
								.description("JWT emitido pelo realm Keycloak (ver keycloak/realm-fds.json).")))
				.addSecurityItem(new SecurityRequirement().addList(ESQUEMA_BEARER));
	}
}
