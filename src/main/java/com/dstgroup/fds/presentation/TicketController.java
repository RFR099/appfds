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
import org.springframework.web.bind.annotation.RestController;

import com.dstgroup.fds.application.dto.AbrirTicketCommand;
import com.dstgroup.fds.application.dto.AbrirTicketResponse;
import com.dstgroup.fds.application.dto.TicketFDSResponse;
import com.dstgroup.fds.application.usecase.AbrirTicketUseCase;
import com.dstgroup.fds.application.usecase.ObterTicketUseCase;
import com.dstgroup.fds.infrastructure.security.PermiteGestao;

/**
 * Fronteira HTTP dos casos de uso de Ticket ("NOVO TICKET" do protótipo).
 *
 * <p>Gestão de fornecedores (Fase 5, Parte 1): comunicação com fornecedores
 * é responsabilidade do gestor, nunca do operador de obra — daí
 * {@code @PermiteGestao} a nível da classe, aplicando-se a ambos os
 * endpoints.</p>
 */
@Tag(name = "Tickets", description = "Pedidos de FDS a fornecedores (\"NOVO TICKET\", RF07). "
		+ "Exclusivo de fds-gestor/fds-admin — nunca fds-operador.")
@RestController
@RequestMapping("/tickets")
@PermiteGestao
public class TicketController {

	private final AbrirTicketUseCase abrirTicketUseCase;
	private final ObterTicketUseCase obterTicketUseCase;

	public TicketController(AbrirTicketUseCase abrirTicketUseCase, ObterTicketUseCase obterTicketUseCase) {
		this.abrirTicketUseCase = abrirTicketUseCase;
		this.obterTicketUseCase = obterTicketUseCase;
	}

	@Operation(summary = "Abre um ticket de pedido de FDS a um fornecedor",
			description = "Requer papel fds-gestor ou fds-admin. `fdsId` é opcional (null = pedido de "
					+ "produto ainda não catalogado). Notifica o fornecedor por e-mail; se a notificação "
					+ "falhar, o ticket já criado não é desfeito.")
	@ApiResponses({
			@ApiResponse(responseCode = "201", description = "Ticket aberto."),
			@ApiResponse(responseCode = "400", description = "Corpo do pedido inválido, ou "
					+ "fdsId/fornecedorId não são UUIDs válidos.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "401", description = "Sem token, ou token inválido/expirado.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "403", description = "Papel insuficiente (fds-operador).",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "404", description = "Não existe nenhum fornecedor com o "
					+ "fornecedorId indicado.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class)))
	})
	@PostMapping
	public ResponseEntity<AbrirTicketResponse> abrir(@RequestBody AbrirTicketCommand comando) {
		AbrirTicketResponse resposta = abrirTicketUseCase.executar(comando);
		return ResponseEntity.created(URI.create("/tickets/" + resposta.id())).body(resposta);
	}

	@Operation(summary = "Obtém um ticket pelo id",
			description = "Requer papel fds-gestor ou fds-admin.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Ticket encontrado, com as suas mensagens."),
			@ApiResponse(responseCode = "400", description = "O id fornecido não é um UUID válido.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "401", description = "Sem token, ou token inválido/expirado.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "403", description = "Papel insuficiente (fds-operador).",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "404", description = "Não existe nenhum ticket com este id.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class)))
	})
	@GetMapping("/{id}")
	public TicketFDSResponse obter(@PathVariable String id) {
		return obterTicketUseCase.executar(id);
	}
}
