package com.dstgroup.fds.presentation;

import java.time.Clock;
import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import com.dstgroup.fds.domain.fds.FDSNaoEncontradaException;
import com.dstgroup.fds.domain.fds.FichaDadosSegurancaDuplicadaException;
import com.dstgroup.fds.domain.fds.FichaDadosSegurancaIncompletaException;
import com.dstgroup.fds.domain.fornecedor.FornecedorNaoEncontradoException;
import com.dstgroup.fds.domain.obra.CentroProdutivoNaoEncontradoException;
import com.dstgroup.fds.domain.obra.ObraNaoEncontradaException;
import com.dstgroup.fds.domain.shared.DomainException;
import com.dstgroup.fds.domain.ticket.TicketFDSNaoEncontradoException;

/**
 * Traduz exceções de domínio (e algumas exceções de framework inevitáveis na
 * fronteira HTTP) para respostas HTTP consistentes, sempre no formato
 * {@link ErroResponse}. É aqui, na fronteira externa do Onion, que o
 * vocabulário do domínio (exceções Java) se transforma em vocabulário HTTP
 * (códigos de estado) — nem o domínio nem a application conhecem HTTP.
 *
 * <p>Recebe um {@link Clock} injetado (Fase 5, Parte 3) — nunca
 * {@code Instant.now()} direto — pela mesma disciplina de determinismo já
 * aplicada em toda a Application desde a Fase 5, Parte 2.</p>
 *
 * <p><b>Handlers acrescentados na Fase 5, Parte 3</b>, para fechar lacunas
 * reais em que um erro do cliente resultava num 500 inconsistente em vez de
 * um 4xx com o mesmo formato do resto da API:</p>
 * <ul>
 *   <li>{@link HttpMessageNotReadableException} — corpo do pedido
 *   ilegível: JSON malformado, um valor de enum desconhecido dentro do
 *   corpo (ex.: {@code pictogramas}), uma data num formato inesperado.</li>
 *   <li>{@link MethodArgumentTypeMismatchException} — um {@code query
 *   param}/{@code path variable} com o tipo errado (ex.: {@code ?pagina=abc}
 *   quando se espera um inteiro).</li>
 *   <li>{@link Exception} (apanha-tudo) — rede de segurança para qualquer
 *   exceção verdadeiramente inesperada (um bug). Regista sempre a exceção
 *   real no log do servidor (para haver visibilidade operacional), mas
 *   devolve ao cliente uma mensagem genérica — nunca {@code ex.getMessage()}
 *   de uma exceção não prevista, que pode conter detalhes internos (nome de
 *   classe, driver, etc.) que não devem ser expostos pela API.</li>
 * </ul>
 *
 * <p>Não precisa de um handler dedicado para {@code IllegalArgumentException}
 * genérica: os pontos que antes deixavam propagar essa exceção crua a partir
 * de dados vindos do cliente (ex.: um UUID mal formado no URL) foram
 * corrigidos na origem para lançarem
 * {@code com.dstgroup.fds.domain.shared.IdentificadorInvalidoException} (uma
 * {@link DomainException}) — já apanhada pelo handler genérico de
 * {@code DomainException} abaixo. Isto evita que uma
 * {@code IllegalArgumentException} de outra origem (ex.: um valor de enum
 * corrompido lido da base de dados em {@code FDSEntityMapper}) seja
 * incorretamente classificada como erro do cliente (400) quando é, na
 * verdade, um problema de integridade de dados do servidor (500).</p>
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

	private static final Logger LOG = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	private final Clock relogio;

	public GlobalExceptionHandler(Clock relogio) {
		this.relogio = relogio;
	}

	@ExceptionHandler(FDSNaoEncontradaException.class)
	public ResponseEntity<ErroResponse> naoEncontrada(FDSNaoEncontradaException ex) {
		return corpoDeErro(HttpStatus.NOT_FOUND, ex.getMessage());
	}

	@ExceptionHandler(FornecedorNaoEncontradoException.class)
	public ResponseEntity<ErroResponse> fornecedorNaoEncontrado(FornecedorNaoEncontradoException ex) {
		return corpoDeErro(HttpStatus.NOT_FOUND, ex.getMessage());
	}

	@ExceptionHandler(CentroProdutivoNaoEncontradoException.class)
	public ResponseEntity<ErroResponse> centroProdutivoNaoEncontrado(CentroProdutivoNaoEncontradoException ex) {
		return corpoDeErro(HttpStatus.NOT_FOUND, ex.getMessage());
	}

	@ExceptionHandler(ObraNaoEncontradaException.class)
	public ResponseEntity<ErroResponse> obraNaoEncontrada(ObraNaoEncontradaException ex) {
		return corpoDeErro(HttpStatus.NOT_FOUND, ex.getMessage());
	}

	@ExceptionHandler(TicketFDSNaoEncontradoException.class)
	public ResponseEntity<ErroResponse> ticketNaoEncontrado(TicketFDSNaoEncontradoException ex) {
		return corpoDeErro(HttpStatus.NOT_FOUND, ex.getMessage());
	}

	@ExceptionHandler(FichaDadosSegurancaDuplicadaException.class)
	public ResponseEntity<ErroResponse> duplicada(FichaDadosSegurancaDuplicadaException ex) {
		return corpoDeErro(HttpStatus.CONFLICT, ex.getMessage());
	}

	@ExceptionHandler(FichaDadosSegurancaIncompletaException.class)
	public ResponseEntity<ErroResponse> incompleta(FichaDadosSegurancaIncompletaException ex) {
		return corpoDeErro(HttpStatus.BAD_REQUEST, ex.getMessage());
	}

	@ExceptionHandler(DomainException.class)
	public ResponseEntity<ErroResponse> outraRegraDeDominio(DomainException ex) {
		// captura as restantes (EmailInvalidoException, MarcaInvalidaException,
		// TransicaoEstadoInvalidaException, IdentificadorInvalidoException,
		// etc.) — todas são erros do pedido (dados inválidos), nunca erros do
		// servidor.
		return corpoDeErro(HttpStatus.BAD_REQUEST, ex.getMessage());
	}

	/**
	 * Lançada pelo {@code @PreAuthorize} (Fase 5, Parte 1 — RBAC) quando o
	 * papel do utilizador autenticado não chega para a operação. Sem este
	 * handler, o corpo da resposta 403 seria a página de erro genérica do
	 * Spring Boot, inconsistente com o formato usado no resto da API.
	 */
	@ExceptionHandler(AccessDeniedException.class)
	public ResponseEntity<ErroResponse> acessoNegado(AccessDeniedException ex) {
		return corpoDeErro(HttpStatus.FORBIDDEN, ex.getMessage());
	}

	/**
	 * Corpo do pedido ilegível — JSON malformado, tipo incompatível num
	 * campo, valor de enum desconhecido (ex.: {@code "pictogramas":
	 * ["NAO_EXISTE"]}), data num formato inesperado. Deliberadamente não usa
	 * {@code ex.getMessage()} — a mensagem real do Jackson é verbosa, em
	 * inglês e pensada para debugging, não para um consumidor da API.
	 */
	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<ErroResponse> corpoIlegivel(HttpMessageNotReadableException ex) {
		return corpoDeErro(HttpStatus.BAD_REQUEST, "O corpo do pedido é inválido ou não pôde ser interpretado.");
	}

	/**
	 * Um {@code query param}/{@code path variable} com um valor que não
	 * pode ser convertido para o tipo esperado (ex.: {@code ?pagina=abc}
	 * quando se espera um inteiro).
	 */
	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	public ResponseEntity<ErroResponse> parametroComTipoInvalido(MethodArgumentTypeMismatchException ex) {
		String mensagem = "O parâmetro '" + ex.getName() + "' tem um valor inválido: '" + ex.getValue() + "'.";
		return corpoDeErro(HttpStatus.BAD_REQUEST, mensagem);
	}

	/**
	 * Ficheiro enviado acima do limite {@code spring.servlet.multipart.max-file-size}
	 * (hoje 5 MB, ver {@code application.yml}) — lançada pelo próprio Spring
	 * antes sequer do pedido chegar ao {@code FDSController}, portanto antes
	 * de {@code ImagemProduto} (domínio) ter oportunidade de validar o
	 * tamanho e lançar {@code ImagemProdutoInvalidaException}. Mapeada para o
	 * mesmo 400 desse caso irmão — é o mesmo tipo de problema (imagem
	 * demasiado grande), só apanhado numa camada diferente.
	 */
	@ExceptionHandler(MaxUploadSizeExceededException.class)
	public ResponseEntity<ErroResponse> ficheiroDemasiadoGrande(MaxUploadSizeExceededException ex) {
		return corpoDeErro(HttpStatus.BAD_REQUEST, "O ficheiro enviado excede o tamanho máximo permitido.");
	}

	/**
	 * Rede de segurança (Fase 5, Parte 3): qualquer exceção que chegue até
	 * aqui é, por definição, uma que nenhum handler específico soube tratar
	 * — ou seja, um caso não previsto (um bug). Regista-se sempre a exceção
	 * real no log do servidor a nível ERROR (visibilidade operacional), mas
	 * nunca se devolve {@code ex.getMessage()} ao cliente: uma exceção não
	 * prevista pode conter, na sua mensagem, detalhes internos (nome de
	 * classe, driver JDBC, caminho de ficheiro) que não devem ser expostos
	 * fora do servidor.
	 */
	@ExceptionHandler(Exception.class)
	public ResponseEntity<ErroResponse> erroInesperado(Exception ex) {
		LOG.error("Erro inesperado não tratado por nenhum @ExceptionHandler específico.", ex);
		return corpoDeErro(HttpStatus.INTERNAL_SERVER_ERROR, "Ocorreu um erro interno inesperado.");
	}

	private ResponseEntity<ErroResponse> corpoDeErro(HttpStatus status, String mensagem) {
		ErroResponse corpo = new ErroResponse(Instant.now(relogio).toString(), status.value(), mensagem);
		return ResponseEntity.status(status).body(corpo);
	}
}
