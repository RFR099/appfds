package com.dstgroup.fds.domain.fds;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import com.dstgroup.fds.domain.fornecedor.FornecedorId;
import com.dstgroup.fds.domain.shared.Email;

class FichaDadosSegurancaEdicaoTest {

	private static final DataValidade DATA_VALIDADE =
			new DataValidade(LocalDate.of(2026, 1, 1), LocalDate.of(2027, 1, 1));

	@Test
	void deveAtualizarMarcaEmRascunho() {
		FichaDadosSeguranca fds = fdsMinima();

		fds.atualizarMarca(new Marca("A2Brios"));

		assertThat(fds.marca()).isEqualTo(new Marca("A2Brios"));
	}

	@Test
	void deveRejeitarMarcaNulaAoAtualizar() {
		FichaDadosSeguranca fds = fdsMinima();

		assertThatThrownBy(() -> fds.atualizarMarca(null)).isInstanceOf(NullPointerException.class);
	}

	@Test
	void deveAtualizarFornecedorEmRascunho() {
		FichaDadosSeguranca fds = fdsMinima();
		FornecedorId fornecedorId = FornecedorId.gerar();

		fds.atualizarFornecedor(fornecedorId);

		assertThat(fds.fornecedorId()).isEqualTo(fornecedorId);
	}

	@Test
	void deveAtualizarEmailContactoEmRascunho() {
		FichaDadosSeguranca fds = fdsMinima();

		fds.atualizarEmailContacto(new Email("novo@fornecedor.pt"));

		assertThat(fds.emailContacto()).isEqualTo(new Email("novo@fornecedor.pt"));
	}

	@Test
	void deveAtualizarDataValidadeEmRascunho() {
		FichaDadosSeguranca fds = fdsMinima();

		fds.atualizarDataValidade(DATA_VALIDADE);

		assertThat(fds.dataValidade()).isEqualTo(DATA_VALIDADE);
	}

	@Test
	void deveAdicionarPictogramaEmRascunho() {
		FichaDadosSeguranca fds = fdsMinima();

		fds.adicionarPictograma(PictogramaPerigo.CORROSIVOS);

		assertThat(fds.pictogramas()).containsExactly(PictogramaPerigo.CORROSIVOS);
	}

	@Test
	void deveRemoverPictogramaEmRascunho() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("X", new Marca("3M"), null, null, null,
				java.util.Set.of(PictogramaPerigo.CORROSIVOS, PictogramaPerigo.EXPLOSIVOS), null);

		fds.removerPictograma(PictogramaPerigo.EXPLOSIVOS);

		assertThat(fds.pictogramas()).containsExactly(PictogramaPerigo.CORROSIVOS);
	}

	@Test
	void naoDevePermitirEditarQuandoNaoEstaEmRascunho() {
		FichaDadosSeguranca fds = fdsCompletaAtualizada();

		assertThatThrownBy(() -> fds.atualizarMarca(new Marca("Outra")))
				.isInstanceOf(FichaDadosSegurancaNaoEditavelException.class);
		assertThatThrownBy(() -> fds.atualizarFornecedor(FornecedorId.gerar()))
				.isInstanceOf(FichaDadosSegurancaNaoEditavelException.class);
		assertThatThrownBy(() -> fds.atualizarEmailContacto(new Email("x@y.pt")))
				.isInstanceOf(FichaDadosSegurancaNaoEditavelException.class);
		assertThatThrownBy(() -> fds.atualizarDataValidade(DATA_VALIDADE))
				.isInstanceOf(FichaDadosSegurancaNaoEditavelException.class);
		assertThatThrownBy(() -> fds.adicionarPictograma(PictogramaPerigo.EXPLOSIVOS))
				.isInstanceOf(FichaDadosSegurancaNaoEditavelException.class);
		assertThatThrownBy(() -> fds.removerPictograma(PictogramaPerigo.CORROSIVOS))
				.isInstanceOf(FichaDadosSegurancaNaoEditavelException.class);
	}

	@Test
	void mensagemDeErroDeveMencionarOEstadoAtual() {
		FichaDadosSeguranca fds = fdsCompletaAtualizada();

		assertThatThrownBy(() -> fds.atualizarMarca(new Marca("Outra")))
				.hasMessageContaining("ATUALIZADA");
	}

	private static FichaDadosSeguranca fdsMinima() {
		return FichaDadosSeguranca.criarRascunho("Produto X", new Marca("3M"), null, null, null, null, null);
	}

	private static FichaDadosSeguranca fdsCompletaAtualizada() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto Completo", new Marca("3M"),
				FornecedorId.gerar(), new Email("a@x.pt"), DATA_VALIDADE,
				java.util.Set.of(PictogramaPerigo.CORROSIVOS), null);
		fds.atualizarPara(EstadoFDS.ATUALIZADA);
		return fds;
	}
}
