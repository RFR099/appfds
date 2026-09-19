package com.dstgroup.fds.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.dstgroup.fds.application.dto.AlertasResponse;
import com.dstgroup.fds.application.usecase.ObterAlertasUseCase;
import com.dstgroup.fds.infrastructure.security.PermiteGestao;

/**
 * Fronteira HTTP do "badge" de Alertas (RF09). Fina por design — a
 * composição dos alertas de FDS a expirar com os tickets sem resposta é
 * feita inteiramente em {@link ObterAlertasUseCase}.
 *
 * <p>Reservado a gestor/admin (Fase 5, Parte 1): inclui informação sobre
 * tickets sem resposta do fornecedor, fora do âmbito "apenas consulta FDS"
 * do operador de obra.</p>
 */
@Tag(name = "Alertas", description = "Badge de alertas (RF09): FDS a expirar e tickets sem resposta "
		+ "do fornecedor. Exclusivo de fds-gestor/fds-admin.")
@RestController
@RequestMapping("/alertas")
@PermiteGestao
public class AlertaController {

	private final ObterAlertasUseCase obterAlertasUseCase;

	public AlertaController(ObterAlertasUseCase obterAlertasUseCase) {
		this.obterAlertasUseCase = obterAlertasUseCase;
	}

	@Operation(summary = "Obtém os alertas atuais",
			description = "Requer papel fds-gestor ou fds-admin. Junta FDS a expirar dentro da janela "
					+ "configurada (app.alertas.fds-dias-antecedencia) com tickets abertos sem resposta há "
					+ "mais do que o limiar configurado (app.alertas.ticket-dias-sem-resposta).")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Alertas atuais (eventualmente nenhum)."),
			@ApiResponse(responseCode = "401", description = "Sem token, ou token inválido/expirado.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "403", description = "Papel insuficiente (fds-operador).",
					content = @Content(schema = @Schema(implementation = ErroResponse.class)))
	})
	@GetMapping
	public AlertasResponse obter() {
		return obterAlertasUseCase.executar();
	}
}
