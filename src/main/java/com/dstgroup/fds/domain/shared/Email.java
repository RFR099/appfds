package com.dstgroup.fds.domain.shared;

import java.util.regex.Pattern;

/**
 * Value Object que representa um endereço de e-mail válido.
 *
 * <p>Imutável, sem dependências de framework. A validação de formato é
 * propositadamente simples (RFC completa seria excessiva) — cobre os casos
 * relevantes para o domínio.</p>
 *
 * <p><b>Nota de posicionamento</b>: vive em {@code domain.shared} (não em
 * {@code domain.fds}) porque é um conceito genérico, reutilizado por mais do
 * que um bounded context — inicialmente só por {@code FichaDadosSeguranca}
 * (Fase 1), agora também por {@code Fornecedor} (Fase 2). Colocá-lo dentro de
 * {@code domain.fds} obrigaria {@code domain.fornecedor} a depender de
 * {@code domain.fds}, o inverso do que a referência por id
 * ({@code FornecedorId}) foi desenhada para evitar.</p>
 */
public record Email(String valor) {

	private static final Pattern FORMATO_VALIDO = Pattern.compile(
			"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
	);

	public Email {
		String valorOriginal = valor;
		if (valor == null || valor.isBlank()) {
			throw new EmailInvalidoException(valorOriginal);
		}
		valor = valor.trim();
		if (!FORMATO_VALIDO.matcher(valor).matches()) {
			throw new EmailInvalidoException(valor);
		}
	}
}
