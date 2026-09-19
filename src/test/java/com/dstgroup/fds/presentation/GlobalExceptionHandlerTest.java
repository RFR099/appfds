package com.dstgroup.fds.presentation;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import com.dstgroup.fds.domain.fds.EstadoFDS;
import com.dstgroup.fds.domain.fds.FDSId;
import com.dstgroup.fds.domain.fds.FDSNaoEncontradaException;
import com.dstgroup.fds.domain.fds.FichaDadosSegurancaDuplicadaException;
import com.dstgroup.fds.domain.fds.FichaDadosSegurancaIncompletaException;
import com.dstgroup.fds.domain.fds.Marca;
import com.dstgroup.fds.domain.fds.MarcaInvalidaException;
import com.dstgroup.fds.domain.shared.IdentificadorInvalidoException;

/**
 * Testes de {@link GlobalExceptionHandler} — invocam os métodos anotados com
 * {@code @ExceptionHandler} diretamente como métodos Java normais (não
 * precisam de nenhum contexto Spring/MockMvc para isso: a anotação só
 * importa quando é o {@code ExceptionHandlerExceptionResolver} do Spring a
 * invocar o método; o próprio método é uma função pura e determinística).
 *
 * <p>Com {@link Clock} fixo (Fase 5, Parte 3 — a mesma disciplina de
 * determinismo da Parte 2), é possível assertar o {@code timestamp} exato
 * do corpo de erro, não só "perto de agora".</p>
 */
class GlobalExceptionHandlerTest {

	private static final Instant AGORA = Instant.parse("2026-06-01T10:00:00Z");
	private static final Clock RELOGIO_FIXO = Clock.fixed(AGORA, ZoneOffset.UTC);

	private final GlobalExceptionHandler handler = new GlobalExceptionHandler(RELOGIO_FIXO);

	@Test
	void naoEncontrada_devolve404ComMensagemDoDominio() {
		FDSId id = FDSId.gerar();
		ResponseEntity<ErroResponse> resposta = handler.naoEncontrada(new FDSNaoEncontradaException(id));

		assertThat(resposta.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
		assertThat(resposta.getBody().status()).isEqualTo(404);
		assertThat(resposta.getBody().mensagem()).contains(id.toString());
		assertThat(resposta.getBody().timestamp()).isEqualTo(AGORA.toString());
	}

	@Test
	void duplicada_devolve409() {
		ResponseEntity<ErroResponse> resposta = handler.duplicada(
				new FichaDadosSegurancaDuplicadaException("Produto X", new Marca("3M")));

		assertThat(resposta.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
		assertThat(resposta.getBody().status()).isEqualTo(409);
	}

	@Test
	void incompleta_devolve400() {
		ResponseEntity<ErroResponse> resposta = handler.incompleta(
				new FichaDadosSegurancaIncompletaException("Faltam campos obrigatórios: emailContacto."));

		assertThat(resposta.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
	}

	@Test
	void outraRegraDeDominio_devolve400ComMensagemOriginal() {
		// MarcaInvalidaException é uma DomainException qualquer, apanhada
		// pelo handler genérico — não tem handler dedicado, nem precisa.
		ResponseEntity<ErroResponse> resposta = handler.outraRegraDeDominio(
				new MarcaInvalidaException("O nome da marca não pode ser vazio ou nulo."));

		assertThat(resposta.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
		assertThat(resposta.getBody().mensagem()).isEqualTo("O nome da marca não pode ser vazio ou nulo.");
	}

	@Test
	void identificadorInvalido_ehApanhadaComoDomainExceptionEDevolve400() {
		// Prova a peça central da Fase 5, Parte 3: um id mal formado não
		// tem handler dedicado a IllegalArgumentException — é apanhado aqui
		// só porque IdentificadorInvalidoException é uma DomainException.
		ResponseEntity<ErroResponse> resposta = handler.outraRegraDeDominio(
				new IdentificadorInvalidoException("Id de FDS", "não-é-um-uuid"));

		assertThat(resposta.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
		assertThat(resposta.getBody().mensagem()).contains("não-é-um-uuid");
	}

	@Test
	void acessoNegado_devolve403() {
		ResponseEntity<ErroResponse> resposta = handler.acessoNegado(new AccessDeniedException("Acesso negado"));

		assertThat(resposta.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
		assertThat(resposta.getBody().status()).isEqualTo(403);
	}

	@Test
	void corpoIlegivel_devolve400ComMensagemGenericaNuncaADoJackson() {
		HttpMessageNotReadableException excecaoVerbosaDoJackson =
				new HttpMessageNotReadableException("JSON parse error: mensagem técnica verbosa em inglês", (
						org.springframework.http.HttpInputMessage) null);

		ResponseEntity<ErroResponse> resposta = handler.corpoIlegivel(excecaoVerbosaDoJackson);

		assertThat(resposta.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
		// nunca deixa a mensagem técnica do Jackson chegar ao cliente
		assertThat(resposta.getBody().mensagem()).doesNotContain("JSON parse error");
		assertThat(resposta.getBody().mensagem())
				.isEqualTo("O corpo do pedido é inválido ou não pôde ser interpretado.");
	}

	@Test
	void parametroComTipoInvalido_devolve400ComNomeEValorDoParametro() throws NoSuchMethodException {
		MethodArgumentTypeMismatchException ex = new MethodArgumentTypeMismatchException(
				"abc", Integer.class, "pagina", null, new NumberFormatException("abc"));

		ResponseEntity<ErroResponse> resposta = handler.parametroComTipoInvalido(ex);

		assertThat(resposta.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
		assertThat(resposta.getBody().mensagem()).contains("pagina").contains("abc");
	}

	@Test
	void ficheiroDemasiadoGrande_devolve400() {
		MaxUploadSizeExceededException ex = new MaxUploadSizeExceededException(5 * 1024 * 1024);

		ResponseEntity<ErroResponse> resposta = handler.ficheiroDemasiadoGrande(ex);

		assertThat(resposta.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
	}

	@Test
	void erroInesperado_devolve500ComMensagemGenericaNuncaADaExcecaoReal() {
		RuntimeException bugQualquer = new RuntimeException("detalhe interno: driver X falhou na linha Y");

		ResponseEntity<ErroResponse> resposta = handler.erroInesperado(bugQualquer);

		assertThat(resposta.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
		assertThat(resposta.getBody().mensagem()).doesNotContain("detalhe interno");
		assertThat(resposta.getBody().mensagem()).isEqualTo("Ocorreu um erro interno inesperado.");
	}

	@Test
	void timestampDoErroUsaSempreORelogioInjetado() {
		ResponseEntity<ErroResponse> resposta = handler.naoEncontrada(new FDSNaoEncontradaException(FDSId.gerar()));

		assertThat(resposta.getBody().timestamp()).isEqualTo(RELOGIO_FIXO.instant().toString());
	}

	@Test
	void estadoFDS_deComValorInvalido_lancaIdentificadorInvalidoExceptionApanhadaAqui() {
		// Fecha o ciclo ponta-a-ponta: EstadoFDS.de(...) (usado por
		// FDSController#listar) lança IdentificadorInvalidoException, que
		// este handler já sabe traduzir para 400 sem nenhum caso especial.
		IdentificadorInvalidoException ex = org.junit.jupiter.api.Assertions.assertThrows(
				IdentificadorInvalidoException.class, () -> EstadoFDS.de("NAO_EXISTE"));

		ResponseEntity<ErroResponse> resposta = handler.outraRegraDeDominio(ex);

		assertThat(resposta.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
		assertThat(resposta.getBody().mensagem()).contains("NAO_EXISTE");
	}
}
