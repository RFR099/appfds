package com.dstgroup.fds.domain.shared;

/**
 * Classe base para todas as exceções de regras de negócio do domínio.
 *
 * <p>Nunca deve depender de frameworks (Spring, JPA, etc.). É apanhada e traduzida
 * para respostas HTTP na camada de {@code presentation} (ex.: via
 * {@code @ControllerAdvice}), mantendo o domínio agnóstico de HTTP.</p>
 */
public abstract class DomainException extends RuntimeException {

	protected DomainException(String message) {
		super(message);
	}
}
