package com.dstgroup.fds.domain.shared;

/**
 * Lançada quando uma {@code String} recebida como identificador (tipicamente
 * vinda de um {@code path variable} ou {@code query param} HTTP) não é um
 * {@link java.util.UUID} válido, ou quando um valor recebido não corresponde
 * a nenhuma constante de um enum de domínio (ex.: {@code estado} inválido).
 *
 * <p>Introduzida na Fase 5, Parte 3 para fechar uma lacuna real: antes desta
 * parte, os métodos {@code XxxId.de(String)} deixavam propagar a
 * {@link IllegalArgumentException} crua de {@code UUID.fromString}/
 * {@code Enum.valueOf} — que não é apanhada por nenhum
 * {@code @ExceptionHandler} e por isso resultava em 500 Internal Server
 * Error para o que é, claramente, um erro do cliente (um id mal formado no
 * URL), não do servidor. Ao ser uma {@link DomainException}, esta exceção é
 * automaticamente apanhada pelo handler genérico de {@code DomainException}
 * em {@code GlobalExceptionHandler} e devolve 400 Bad Request, sem precisar
 * de nenhum caso especial ali.</p>
 *
 * <p>Deliberadamente não usada nos pontos onde um valor de enum é lido de
 * volta da base de dados (ex.: {@code FDSAuditoriaEntityMapper},
 * {@code FDSEntityMapper}) — um valor inválido nesses pontos não é um erro
 * do cliente, é um problema de integridade de dados do servidor, e deve
 * continuar a resultar em 500 (apanhado pelo handler genérico de
 * {@code Exception}), nunca ser mascarado como 400.</p>
 */
public class IdentificadorInvalidoException extends DomainException {

	public IdentificadorInvalidoException(String tipo, String valorInvalido) {
		super(tipo + " inválido: '" + valorInvalido + "'");
	}
}
