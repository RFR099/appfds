package com.dstgroup.fds.domain.fornecedor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.dstgroup.fds.domain.shared.Email;

class FornecedorTest {

	@Test
	void deveCriarFornecedorComNomeEEmailPrincipal() {
		Fornecedor fornecedor = Fornecedor.criar(new NomeFornecedor("3M"), new Email("contacto@3m.com"), null);

		assertThat(fornecedor.nome()).isEqualTo(new NomeFornecedor("3M"));
		assertThat(fornecedor.emailPrincipal()).isEqualTo(new Email("contacto@3m.com"));
		assertThat(fornecedor.contactos()).isEmpty();
	}

	@Test
	void deveAceitarContactosIniciais() {
		Fornecedor fornecedor = Fornecedor.criar(new NomeFornecedor("3M"), new Email("contacto@3m.com"),
				List.of("+351 210 000 000", "+351 210 000 001"));

		assertThat(fornecedor.contactos()).containsExactly("+351 210 000 000", "+351 210 000 001");
	}

	@Test
	void deveRejeitarNomeNulo() {
		assertThatThrownBy(() -> Fornecedor.criar(null, new Email("contacto@3m.com"), null))
				.isInstanceOf(NullPointerException.class);
	}

	@Test
	void deveRejeitarEmailPrincipalNulo() {
		assertThatThrownBy(() -> Fornecedor.criar(new NomeFornecedor("3M"), null, null))
				.isInstanceOf(NullPointerException.class);
	}

	@Test
	void deveGerarIdUnicoParaCadaFornecedorCriado() {
		Fornecedor a = Fornecedor.criar(new NomeFornecedor("3M"), new Email("a@3m.com"), null);
		Fornecedor b = Fornecedor.criar(new NomeFornecedor("3M"), new Email("a@3m.com"), null);

		assertThat(a.id()).isNotEqualTo(b.id());
	}

	@Test
	void duasFornecedoresDiferentesNuncaSaoIguaisMesmoComOsMesmosDados() {
		Fornecedor a = Fornecedor.criar(new NomeFornecedor("3M"), new Email("a@3m.com"), null);
		Fornecedor b = Fornecedor.criar(new NomeFornecedor("3M"), new Email("a@3m.com"), null);

		assertThat(a).isNotEqualTo(b);
	}

	@Test
	void umFornecedorEIgualASiProprio() {
		Fornecedor fornecedor = Fornecedor.criar(new NomeFornecedor("3M"), new Email("a@3m.com"), null);

		assertThat(fornecedor).isEqualTo(fornecedor);
	}

	@Test
	void deveAdicionarNovoContacto() {
		Fornecedor fornecedor = Fornecedor.criar(new NomeFornecedor("3M"), new Email("a@3m.com"), null);

		fornecedor.adicionarContacto("+351 210 000 000");

		assertThat(fornecedor.contactos()).containsExactly("+351 210 000 000");
	}

	@Test
	void deveRejeitarContactoNuloOuEmBranco() {
		Fornecedor fornecedor = Fornecedor.criar(new NomeFornecedor("3M"), new Email("a@3m.com"), null);

		assertThatThrownBy(() -> fornecedor.adicionarContacto(null))
				.isInstanceOf(ContactoFornecedorInvalidoException.class);
		assertThatThrownBy(() -> fornecedor.adicionarContacto("   "))
				.isInstanceOf(ContactoFornecedorInvalidoException.class);
	}

	@Test
	void deveExporContactosComoColecaoImutavel() {
		Fornecedor fornecedor = Fornecedor.criar(new NomeFornecedor("3M"), new Email("a@3m.com"), null);

		assertThatThrownBy(() -> fornecedor.contactos().add("outro"))
				.isInstanceOf(UnsupportedOperationException.class);
	}

	@Test
	void deveReidratarPreservandoOIdReal() {
		FornecedorId id = FornecedorId.gerar();

		Fornecedor reidratado = Fornecedor.reidratar(id, new NomeFornecedor("3M"), new Email("a@3m.com"),
				List.of("+351 210 000 000"));

		assertThat(reidratado.id()).isEqualTo(id);
		assertThat(reidratado.contactos()).containsExactly("+351 210 000 000");
	}
}
