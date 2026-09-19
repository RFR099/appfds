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

import com.dstgroup.fds.application.dto.CriarObraCommand;
import com.dstgroup.fds.application.dto.CriarObraResponse;
import com.dstgroup.fds.application.dto.ObraResponse;
import com.dstgroup.fds.application.dto.ObraResumoResponse;
import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.usecase.CriarObraUseCase;
import com.dstgroup.fds.application.usecase.ListarObrasUseCase;
import com.dstgroup.fds.application.usecase.ObterObraUseCase;
import com.dstgroup.fds.infrastructure.security.PermiteAdmin;
import com.dstgroup.fds.infrastructure.security.PermiteConsulta;

/**
 * Fronteira HTTP de Obra. Criar é reservado a {@code fds-admin} (Fase 5,
 * Parte 1), pela mesma razão de {@link CentroProdutivoController}.
 */
@Tag(name = "Obras", description = "Estrutura organizacional do cliente. Criar é exclusivo de "
		+ "fds-admin; consultar, qualquer papel.")
@RestController
@RequestMapping("/obras")
public class ObraController {

	private final CriarObraUseCase criarUseCase;
	private final ObterObraUseCase obterUseCase;
	private final ListarObrasUseCase listarUseCase;

	public ObraController(CriarObraUseCase criarUseCase, ObterObraUseCase obterUseCase,
			ListarObrasUseCase listarUseCase) {
		this.criarUseCase = criarUseCase;
		this.obterUseCase = obterUseCase;
		this.listarUseCase = listarUseCase;
	}

	@Operation(summary = "Cria uma obra", description = "Requer papel fds-admin.")
	@ApiResponses({
			@ApiResponse(responseCode = "201", description = "Obra criada."),
			@ApiResponse(responseCode = "400", description = "Corpo do pedido inválido.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "401", description = "Sem token, ou token inválido/expirado.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "403", description = "Papel insuficiente (fds-gestor/fds-operador).",
					content = @Content(schema = @Schema(implementation = ErroResponse.class)))
	})
	@PermiteAdmin
	@PostMapping
	public ResponseEntity<CriarObraResponse> criar(@RequestBody CriarObraCommand comando) {
		CriarObraResponse resposta = criarUseCase.executar(comando);
		return ResponseEntity.created(URI.create("/obras/" + resposta.id())).body(resposta);
	}

	@Operation(summary = "Obtém uma obra pelo id", description = "Acessível a qualquer papel autenticado.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Obra encontrada."),
			@ApiResponse(responseCode = "400", description = "O id fornecido não é um UUID válido.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "401", description = "Sem token, ou token inválido/expirado.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "404", description = "Não existe nenhuma obra com este id.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class)))
	})
	@PermiteConsulta
	@GetMapping("/{id}")
	public ObraResponse obter(@PathVariable String id) {
		return obterUseCase.executar(id);
	}

	@Operation(summary = "Lista obras (paginado)", description = "Acessível a qualquer papel autenticado.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Página de resultados (eventualmente vazia)."),
			@ApiResponse(responseCode = "401", description = "Sem token, ou token inválido/expirado.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class)))
	})
	@PermiteConsulta
	@GetMapping
	public Pagina<ObraResumoResponse> listar(
			@RequestParam(defaultValue = "0") int pagina,
			@RequestParam(defaultValue = "20") int tamanho) {
		return listarUseCase.executar(pagina, tamanho);
	}
}
