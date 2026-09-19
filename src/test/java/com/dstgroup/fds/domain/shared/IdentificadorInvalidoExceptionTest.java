package com.dstgroup.fds.domain.shared;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.dstgroup.fds.domain.fds.EstadoFDS;
import com.dstgroup.fds.domain.fds.FDSId;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;
import com.dstgroup.fds.domain.obra.CentroProdutivoId;
import com.dstgroup.fds.domain.obra.ObraId;
import com.dstgroup.fds.domain.ticket.TicketFDSId;

/**
 * Testa o comportamento introduzido na Fase 5, Parte 3: todos os métodos
 * {@code XxxId.de(String)} (e {@code EstadoFDS.de(String)}) devem traduzir
 * um valor mal formado em {@link IdentificadorInvalidoException} — nunca
 * deixar propagar a {@link IllegalArgumentException} crua de
 * {@code UUID.fromString}/{@code Enum.valueOf}, que não é apanhada por
 * nenhum {@code @ExceptionHandler} e antes desta parte resultava num 500
 * para o que é claramente um erro do cliente (um id/estado mal formado no
 * URL).
 *
 * <p>Um único ficheiro de teste para os cinco tipos de id + {@code EstadoFDS}
 * porque seguem exatamente o mesmo padrão — evita duplicar cinco vezes a
 * mesma estrutura de teste.</p>
 */
class IdentificadorInvalidoExceptionTest {

	private static final String VALOR_INVALIDO = "não-é-um-uuid";

	@Test
	void ehUmaDomainException() {
		// Propriedade central de que depende o GlobalExceptionHandler: não
		// precisa de nenhum @ExceptionHandler dedicado a esta exceção, só do
		// handler genérico de DomainException.
		assertThat(new IdentificadorInvalidoException("Id de FDS", VALOR_INVALIDO)).isInstanceOf(DomainException.class);
	}

	@Test
	void mensagemInclueOTipoEOValorInvalido() {
		IdentificadorInvalidoException ex = new IdentificadorInvalidoException("Id de FDS", VALOR_INVALIDO);

		assertThat(ex.getMessage()).contains("Id de FDS").contains(VALOR_INVALIDO);
	}

	@Test
	void fdsId_deComValorInvalido_lancaIdentificadorInvalidoException() {
		assertThatThrownBy(() -> FDSId.de(VALOR_INVALIDO))
				.isInstanceOf(IdentificadorInvalidoException.class)
				.hasMessageContaining(VALOR_INVALIDO);
	}

	@Test
	void fdsId_deComValorValido_continuaAFuncionar() {
		UUID id = UUID.randomUUID();
		assertThat(FDSId.de(id.toString())).isEqualTo(new FDSId(id));
	}

	@Test
	void fornecedorId_deComValorInvalido_lancaIdentificadorInvalidoException() {
		assertThatThrownBy(() -> FornecedorId.de(VALOR_INVALIDO))
				.isInstanceOf(IdentificadorInvalidoException.class)
				.hasMessageContaining(VALOR_INVALIDO);
	}

	@Test
	void fornecedorId_deComValorValido_continuaAFuncionar() {
		UUID id = UUID.randomUUID();
		assertThat(FornecedorId.de(id.toString())).isEqualTo(new FornecedorId(id));
	}

	@Test
	void obraId_deComValorInvalido_lancaIdentificadorInvalidoException() {
		assertThatThrownBy(() -> ObraId.de(VALOR_INVALIDO))
				.isInstanceOf(IdentificadorInvalidoException.class)
				.hasMessageContaining(VALOR_INVALIDO);
	}

	@Test
	void obraId_deComValorValido_continuaAFuncionar() {
		UUID id = UUID.randomUUID();
		assertThat(ObraId.de(id.toString())).isEqualTo(new ObraId(id));
	}

	@Test
	void centroProdutivoId_deComValorInvalido_lancaIdentificadorInvalidoException() {
		assertThatThrownBy(() -> CentroProdutivoId.de(VALOR_INVALIDO))
				.isInstanceOf(IdentificadorInvalidoException.class)
				.hasMessageContaining(VALOR_INVALIDO);
	}

	@Test
	void centroProdutivoId_deComValorValido_continuaAFuncionar() {
		UUID id = UUID.randomUUID();
		assertThat(CentroProdutivoId.de(id.toString())).isEqualTo(new CentroProdutivoId(id));
	}

	@Test
	void ticketFDSId_deComValorInvalido_lancaIdentificadorInvalidoException() {
		assertThatThrownBy(() -> TicketFDSId.de(VALOR_INVALIDO))
				.isInstanceOf(IdentificadorInvalidoException.class)
				.hasMessageContaining(VALOR_INVALIDO);
	}

	@Test
	void ticketFDSId_deComValorValido_continuaAFuncionar() {
		UUID id = UUID.randomUUID();
		assertThat(TicketFDSId.de(id.toString())).isEqualTo(new TicketFDSId(id));
	}

	@Test
	void estadoFDS_deComValorInvalido_lancaIdentificadorInvalidoException() {
		assertThatThrownBy(() -> EstadoFDS.de("NAO_EXISTE"))
				.isInstanceOf(IdentificadorInvalidoException.class)
				.hasMessageContaining("NAO_EXISTE");
	}

	@Test
	void estadoFDS_deComValorValido_continuaAFuncionar() {
		assertThat(EstadoFDS.de("ATUALIZADA")).isEqualTo(EstadoFDS.ATUALIZADA);
	}
}
