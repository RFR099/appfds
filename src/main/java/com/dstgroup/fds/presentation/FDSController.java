package com.dstgroup.fds.presentation;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.util.List;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.dstgroup.fds.application.dto.AdicionarImagemFDSCommand;
import com.dstgroup.fds.application.dto.AtualizarFDSCommand;
import com.dstgroup.fds.application.dto.CriarFDSCommand;
import com.dstgroup.fds.application.dto.CriarFDSResponse;
import com.dstgroup.fds.application.dto.FDSResponse;
import com.dstgroup.fds.application.dto.FDSResumoResponse;
import com.dstgroup.fds.application.dto.FiltroFDS;
import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.dto.RegistoAuditoriaResponse;
import com.dstgroup.fds.application.usecase.AdicionarImagemFDSUseCase;
import com.dstgroup.fds.application.usecase.AtualizarFDSUseCase;
import com.dstgroup.fds.application.usecase.CriarFDSUseCase;
import com.dstgroup.fds.application.usecase.ListarFDSUseCase;
import com.dstgroup.fds.application.usecase.ObterFDSUseCase;
import com.dstgroup.fds.application.usecase.ObterHistoricoAuditoriaUseCase;
import com.dstgroup.fds.domain.fds.EstadoFDS;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;
import com.dstgroup.fds.domain.obra.CentroProdutivoId;
import com.dstgroup.fds.domain.obra.ObraId;
import com.dstgroup.fds.infrastructure.security.PermiteConsulta;
import com.dstgroup.fds.infrastructure.security.PermiteGestao;

/**
 * Fronteira HTTP dos casos de uso de FDS. Fina por design — nenhuma regra de
 * negócio aqui, só tradução HTTP <-> Application.
 */
@Tag(name = "FDS", description = "Fichas de Dados de Segurança — catalogação, ciclo de vida e histórico.")
@RestController
@RequestMapping("/fds")
public class FDSController {

	private final CriarFDSUseCase criarFDSUseCase;
	private final ObterFDSUseCase obterFDSUseCase;
	private final ListarFDSUseCase listarFDSUseCase;
	private final AtualizarFDSUseCase atualizarFDSUseCase;
	private final AdicionarImagemFDSUseCase adicionarImagemFDSUseCase;
	private final ObterHistoricoAuditoriaUseCase obterHistoricoAuditoriaUseCase;

	public FDSController(CriarFDSUseCase criarFDSUseCase, ObterFDSUseCase obterFDSUseCase,
			ListarFDSUseCase listarFDSUseCase, AtualizarFDSUseCase atualizarFDSUseCase,
			AdicionarImagemFDSUseCase adicionarImagemFDSUseCase,
			ObterHistoricoAuditoriaUseCase obterHistoricoAuditoriaUseCase) {
		this.criarFDSUseCase = criarFDSUseCase;
		this.obterFDSUseCase = obterFDSUseCase;
		this.listarFDSUseCase = listarFDSUseCase;
		this.atualizarFDSUseCase = atualizarFDSUseCase;
		this.adicionarImagemFDSUseCase = adicionarImagemFDSUseCase;
		this.obterHistoricoAuditoriaUseCase = obterHistoricoAuditoriaUseCase;
	}

	@Operation(summary = "Cria uma nova FDS",
			description = "Requer papel fds-gestor ou fds-admin. Campos opcionais (fornecedorId, "
					+ "datas, pictogramas, obrasIds) suportam a criação de um rascunho incompleto (RF06).")
	@ApiResponses({
			@ApiResponse(responseCode = "201", description = "FDS criada."),
			@ApiResponse(responseCode = "400", description = "Corpo do pedido inválido ou malformado.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "401", description = "Sem token, ou token inválido/expirado.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "403", description = "Papel insuficiente (ex.: fds-operador).",
					content = @Content(schema = @Schema(implementation = ErroResponse.class)))
	})
	@PermiteGestao
	@PostMapping
	public ResponseEntity<CriarFDSResponse> criar(@RequestBody CriarFDSCommand comando) {
		CriarFDSResponse resposta = criarFDSUseCase.executar(comando);
		return ResponseEntity.created(URI.create("/fds/" + resposta.id())).body(resposta);
	}

	@Operation(summary = "Obtém uma FDS pelo id",
			description = "Acessível a qualquer papel autenticado (fds-operador incluído — apenas consulta).")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "FDS encontrada."),
			@ApiResponse(responseCode = "400", description = "O id fornecido não é um UUID válido.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "401", description = "Sem token, ou token inválido/expirado.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "404", description = "Não existe nenhuma FDS com este id.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class)))
	})
	@PermiteConsulta
	@GetMapping("/{id}")
	public FDSResponse obter(@PathVariable String id) {
		return obterFDSUseCase.executar(id);
	}

	@Operation(summary = "Lista/filtra FDS (paginado)",
			description = "Acessível a qualquer papel autenticado. Todos os parâmetros de filtro são "
					+ "opcionais e combináveis; sem nenhum, devolve todas as FDS paginadas.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Página de resultados (eventualmente vazia)."),
			@ApiResponse(responseCode = "400",
					description = "Um parâmetro tem um valor inválido (ex.: `estado` desconhecido, "
							+ "`pagina`/`tamanho` não numéricos, um id de filtro que não é um UUID válido).",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "401", description = "Sem token, ou token inválido/expirado.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class)))
	})
	@PermiteConsulta
	@GetMapping
	public Pagina<FDSResumoResponse> listar(
			@RequestParam(required = false) String centroProdutivoId,
			@RequestParam(required = false) String nome,
			@RequestParam(required = false) String fornecedorId,
			@RequestParam(required = false) String obraId,
			@RequestParam(required = false) String marca,
			@Parameter(description = "Um dos valores de EstadoFDS: RASCUNHO, ATUALIZADA ou OBSOLETA.")
			@RequestParam(required = false) String estado,
			@RequestParam(defaultValue = "0") int pagina,
			@RequestParam(defaultValue = "20") int tamanho) {
		FiltroFDS filtro = new FiltroFDS(
				centroProdutivoId == null ? null : CentroProdutivoId.de(centroProdutivoId),
				nome,
				fornecedorId == null ? null : FornecedorId.de(fornecedorId),
				obraId == null ? null : ObraId.de(obraId),
				marca,
				estado == null ? null : EstadoFDS.de(estado)
		);
		return listarFDSUseCase.executar(filtro, pagina, tamanho);
	}

	/**
	 * Atualiza uma FDS em RASCUNHO (RF06). O {@code id} do caminho manda
	 * sempre — qualquer {@code id} vindo no corpo do pedido é ignorado, para
	 * não haver ambiguidade entre os dois.
	 */
	@Operation(summary = "Atualiza campos de uma FDS",
			description = "Requer papel fds-gestor ou fds-admin. Campo omitido/null no corpo = "
					+ "\"não alterar\" (não existe forma de limpar um campo já preenchido através deste "
					+ "endpoint). `pictogramas`, quando presente, substitui o conjunto completo.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "FDS atualizada."),
			@ApiResponse(responseCode = "400", description = "Corpo do pedido inválido, ou o id do "
					+ "caminho não é um UUID válido.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "401", description = "Sem token, ou token inválido/expirado.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "403", description = "Papel insuficiente (ex.: fds-operador).",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "404", description = "Não existe nenhuma FDS com este id.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class)))
	})
	@PermiteGestao
	@PatchMapping("/{id}")
	public FDSResponse atualizar(@PathVariable String id, @RequestBody AtualizarFDSCommand corpo) {
		AtualizarFDSCommand comando = new AtualizarFDSCommand(id, corpo.marca(), corpo.fornecedorId(),
				corpo.emailContacto(), corpo.dataRevisao(), corpo.dataValidade(), corpo.pictogramas());
		return atualizarFDSUseCase.executar(comando);
	}

	/**
	 * Upload da imagem do produto químico (campo "IMAGEM DO PRODUTO
	 * QUÍMICO" do protótipo) — {@code multipart/form-data}.
	 */
	@Operation(summary = "Faz upload da imagem do produto químico",
			description = "Requer papel fds-gestor ou fds-admin. Limite de 5 MB "
					+ "(spring.servlet.multipart.max-file-size) — um ficheiro maior é rejeitado com 400 "
					+ "antes de chegar a este código (ver MaxUploadSizeExceededException).")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Imagem associada à FDS."),
			@ApiResponse(responseCode = "400", description = "Ficheiro em falta, inválido, ou maior "
					+ "que o limite de 5 MB, ou o id do caminho não é um UUID válido.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "401", description = "Sem token, ou token inválido/expirado.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "403", description = "Papel insuficiente (ex.: fds-operador).",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "404", description = "Não existe nenhuma FDS com este id.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class)))
	})
	@PermiteGestao
	@PostMapping(value = "/{id}/imagem", consumes = "multipart/form-data")
	public FDSResponse adicionarImagem(@PathVariable String id, @RequestPart("ficheiro") MultipartFile ficheiro) {
		byte[] conteudo;
		try {
			conteudo = ficheiro.getBytes();
		} catch (IOException e) {
			throw new UncheckedIOException("Não foi possível ler o ficheiro enviado.", e);
		}
		AdicionarImagemFDSCommand comando = new AdicionarImagemFDSCommand(
				id, conteudo, ficheiro.getOriginalFilename(), ficheiro.getContentType());
		return adicionarImagemFDSUseCase.executar(comando);
	}

	/**
	 * Histórico de auditoria de transições de estado da FDS (RF12).
	 */
	@Operation(summary = "Histórico de auditoria de transições de estado da FDS (RF12)",
			description = "Requer papel fds-gestor ou fds-admin. Devolve uma entrada por transição de "
					+ "estado (ex.: RASCUNHO -> ATUALIZADA), com quem a fez (`utilizador`, `null` para "
					+ "transições automáticas do job agendado) e quando.")
	@ApiResponses({
			@ApiResponse(responseCode = "200", description = "Histórico (eventualmente vazio, se a "
					+ "FDS nunca transitou de estado)."),
			@ApiResponse(responseCode = "400", description = "O id fornecido não é um UUID válido.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "401", description = "Sem token, ou token inválido/expirado.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "403", description = "Papel insuficiente (ex.: fds-operador).",
					content = @Content(schema = @Schema(implementation = ErroResponse.class))),
			@ApiResponse(responseCode = "404", description = "Não existe nenhuma FDS com este id.",
					content = @Content(schema = @Schema(implementation = ErroResponse.class)))
	})
	@PermiteGestao
	@GetMapping("/{id}/auditoria")
	public List<RegistoAuditoriaResponse> auditoria(@PathVariable String id) {
		return obterHistoricoAuditoriaUseCase.executar(id);
	}
}
