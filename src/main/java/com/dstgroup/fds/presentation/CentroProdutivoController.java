package com.dstgroup.fds.presentation;

import java.net.URI;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.dstgroup.fds.application.dto.CentroProdutivoResponse;
import com.dstgroup.fds.application.dto.CentroProdutivoResumoResponse;
import com.dstgroup.fds.application.dto.CriarCentroProdutivoCommand;
import com.dstgroup.fds.application.dto.CriarCentroProdutivoResponse;
import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.usecase.CriarCentroProdutivoUseCase;
import com.dstgroup.fds.application.usecase.ListarCentrosProdutivosUseCase;
import com.dstgroup.fds.application.usecase.ObterCentroProdutivoUseCase;
import com.dstgroup.fds.infrastructure.security.PermiteAdmin;
import com.dstgroup.fds.infrastructure.security.PermiteConsulta;

/**
 * Fronteira HTTP de Centro Produtivo. Criar é reservado a
 * {@code fds-admin} (Fase 5, Parte 1) — ver {@link PermiteAdmin} para a
 * justificação desta decisão de âmbito.
 */
@Tag(name = "Centros Produtivos", description = "Estrutura organizacional do cliente. Criar é "
		+ "exclusivo de fds-admin; consultar, qualquer papel.")
@RestController
@RequestMapping("/centros-produtivos")
public class CentroProdutivoController {

	private final CriarCentroProdutivoUseCase criarUseCase;
	private final ObterCentroProdutivoUseCase obterUseCase;
	private final ListarCentrosProdutivosUseCase listarUseCase;

	public CentroProdutivoController(CriarCentroProdutivoUseCase criarUseCase,
			ObterCentroProdutivoUseCase obterUseCase, ListarCentrosProdutivosUseCase listarUseCase) {
		this.criarUseCase = criarUseCase;
		this.obterUseCase = obterUseCase;
		this.listarUseCase = listarUseCase;
	}

	@Operation(summary = "Cria um centro produtivo", description = "Requer papel fds-admin.")
	@ApiResponses({
			@ApiResponse(responseCode = "201", description = "Centro produtivo criado."),
			@ApiResponse(responseCode = "400", description = "Corpo do pedido inválido.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "401", description = "Sem token, ou token inválido/expirado.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "403", description = "Papel insuficiente (fds-gestor/fds-operador).",
					content = @Content(schema = @Schema(implementation = ErroResponse.class)))
	})
	@PermiteAdmin
	@PostMapping
	public ResponseEntity<CriarCentroProdutivoResponse> criar(@RequestBody CriarCentroProdutivoCommand comando) {
		CriarCentroProdutivoResponse resposta = criarUseCase.executar(comando);
		return ResponseEntity.created(URI.create("/centros-produtivos/" + resposta.id())).body(resposta);
	}

	@Operation(summary = "Obtém um centro produtivo pelo id",
			description = "Acessível a qualquer papel autenticado.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Centro produtivo encontrado."),
			@ApiResponse(responseCode = "400", description = "O id fornecido não é um UUID válido.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "401", description = "Sem token, ou token inválido/expirado.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "404", description = "Não existe nenhum centro produtivo com este id.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class)))
	})
	@PermiteConsulta
	@GetMapping("/{id}")
	public CentroProdutivoResponse obter(@PathVariable String id) {
		return obterUseCase.executar(id);
	}

	@Operation(summary = "Lista centros produtivos (paginado)",
			description = "Acessível a qualquer papel autenticado.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Página de resultados (eventualmente vazia)."),
			@ApiResponse(responseCode = "401", description = "Sem token, ou token inválido/expirado.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class)))
	})
	@PermiteConsulta
	@GetMapping
	public Pagina<CentroProdutivoResumoResponse> listar(
			@RequestParam(defaultValue = "0") int pagina,
			@RequestParam(defaultValue = "20") int tamanho) {
		return listarUseCase.executar(pagina, tamanho);
	}
}
