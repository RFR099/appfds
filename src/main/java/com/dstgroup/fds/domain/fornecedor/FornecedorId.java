package com.dstgroup.fds.domain.fornecedor;

import java.util.Objects;
import java.util.UUID;

import com.dstgroup.fds.domain.shared.IdentificadorInvalidoException;

/**
 * Identidade do agregado {@code Fornecedor} (a implementar na Fase 2).
 *
 * <p>Introduzida já na Fase 1 porque {@code FichaDadosSeguranca} referencia
 * o fornecedor apenas pelo seu id — prática comum em DDD para não acoplar
 * agregados diretamente entre si.</p>
 */
public record FornecedorId(UUID valor) {

	public FornecedorId {
		Objects.requireNonNull(valor, "O id do fornecedor não pode ser nulo.");
	}

	public static FornecedorId gerar() {
		return new FornecedorId(UUID.randomUUID());
	}

	/**
	 * @throws IdentificadorInvalidoException (Fase 5, Parte 3) se {@code valor}
	 * não for um {@link UUID} válido — ver javadoc de {@code FDSId#de}.
	 */
	public static FornecedorId de(String valor) {
		try {
			return new FornecedorId(UUID.fromString(valor));
		} catch (IllegalArgumentException e) {
			throw new IdentificadorInvalidoException("Id de fornecedor", valor);
		}
	}

	@Override
	public String toString() {
		return valor.toString();
	}
}
