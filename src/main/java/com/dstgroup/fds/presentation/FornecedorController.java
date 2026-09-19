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

import com.dstgroup.fds.application.dto.CriarFornecedorCommand;
import com.dstgroup.fds.application.dto.CriarFornecedorResponse;
import com.dstgroup.fds.application.dto.FornecedorResponse;
import com.dstgroup.fds.application.dto.FornecedorResumoResponse;
import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.usecase.CriarFornecedorUseCase;
import com.dstgroup.fds.application.usecase.ListarFornecedoresUseCase;
import com.dstgroup.fds.application.usecase.ObterFornecedorUseCase;
import com.dstgroup.fds.infrastructure.security.PermiteConsulta;
import com.dstgroup.fds.infrastructure.security.PermiteGestao;

/**
 * Fronteira HTTP dos casos de uso de Fornecedor. {@code POST /fornecedores}
 * é usado tanto por um eventual ecrã dedicado como pelo botão "Adicionar
 * Fornecedor" inline do formulário de FDS (RF05); {@code GET /fornecedores}
 * alimenta o campo de pesquisa "Fornecedor" do filtro de FDS.
 */
@Tag(name = "Fornecedores", description = "Fornecedores de produtos químicos. Criar é fds-gestor/"
		+ "fds-admin; consultar, qualquer papel.")
@RestController
@RequestMapping("/fornecedores")
public class FornecedorController {

	private final CriarFornecedorUseCase criarFornecedorUseCase;
	private final ObterFornecedorUseCase obterFornecedorUseCase;
	private final ListarFornecedoresUseCase listarFornecedoresUseCase;

	public FornecedorController(CriarFornecedorUseCase criarFornecedorUseCase,
			ObterFornecedorUseCase obterFornecedorUseCase, ListarFornecedoresUseCase listarFornecedoresUseCase) {
		this.criarFornecedorUseCase = criarFornecedorUseCase;
		this.obterFornecedorUseCase = obterFornecedorUseCase;
		this.listarFornecedoresUseCase = listarFornecedoresUseCase;
	}

	@Operation(summary = "Cria um fornecedor", description = "Requer papel fds-gestor ou fds-admin.")
	@ApiResponses({
			@ApiResponse(responseCode = "201", description = "Fornecedor criado."),
			@ApiResponse(responseCode = "400", description = "Corpo do pedido inválido.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "401", description = "Sem token, ou token inválido/expirado.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "403", description = "Papel insuficiente (fds-operador).",
					content = @Content(schema = @Schema(implementation = ErroResponse.class)))
	})
	@PermiteGestao
	@PostMapping
	public ResponseEntity<CriarFornecedorResponse> criar(@RequestBody CriarFornecedorCommand comando) {
		CriarFornecedorResponse resposta = criarFornecedorUseCase.executar(comando);
		return ResponseEntity.created(URI.create("/fornecedores/" + resposta.id())).body(resposta);
	}

	@Operation(summary = "Obtém um fornecedor pelo id",
			description = "Acessível a qualquer papel autenticado.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Fornecedor encontrado."),
			@ApiResponse(responseCode = "400", description = "O id fornecido não é um UUID válido.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "401", description = "Sem token, ou token inválido/expirado.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "404", description = "Não existe nenhum fornecedor com este id.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class)))
	})
	@PermiteConsulta
	@GetMapping("/{id}")
	public FornecedorResponse obter(@PathVariable String id) {
		return obterFornecedorUseCase.executar(id);
	}

	@Operation(summary = "Lista fornecedores (paginado)",
			description = "Acessível a qualquer papel autenticado.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Página de resultados (eventualmente vazia)."),
			@ApiResponse(responseCode = "401", description = "Sem token, ou token inválido/expirado.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class)))
	})
	@PermiteConsulta
	@GetMapping
	public Pagina<FornecedorResumoResponse> listar(
			@RequestParam(defaultValue = "0") int pagina,
			@RequestParam(defaultValue = "20") int tamanho) {
		return listarFornecedoresUseCase.executar(pagina, tamanho);
	}
}
