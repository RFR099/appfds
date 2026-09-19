package com.dstgroup.fds.domain.fds;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import com.dstgroup.fds.domain.fornecedor.FornecedorId;
import com.dstgroup.fds.domain.shared.Email;

class FichaDadosSegurancaImagemTest {

	private static final ImagemProduto IMAGEM = new ImagemProduto("/uploads/fds/abc.png", "image/png", 1024);

	@Test
	void imagemComecaNulaPorOmissao() {
		FichaDadosSeguranca fds = fdsMinima();

		assertThat(fds.imagem()).isNull();
	}

	@Test
	void temDissocianatosComecaFalsoPorOmissao() {
		FichaDadosSeguranca fds = fdsMinima();

		assertThat(fds.temDissocianatos()).isFalse();
	}

	@Test
	void deveDefinirImagemEmRascunho() {
		FichaDadosSeguranca fds = fdsMinima();

		fds.definirImagem(IMAGEM);

		assertThat(fds.imagem()).isEqualTo(IMAGEM);
	}

	@Test
	void deveRemoverImagemDefinindoNula() {
		FichaDadosSeguranca fds = fdsMinima();
		fds.definirImagem(IMAGEM);

		fds.definirImagem(null);

		assertThat(fds.imagem()).isNull();
	}

	@Test
	void deveAtualizarTemDissocianatosEmRascunho() {
		FichaDadosSeguranca fds = fdsMinima();

		fds.atualizarTemDissocianatos(true);

		assertThat(fds.temDissocianatos()).isTrue();
	}

	@Test
	void naoDevePermitirDefinirImagemForaDeRascunho() {
		FichaDadosSeguranca fds = fdsCompletaAtualizada();

		assertThatThrownBy(() -> fds.definirImagem(IMAGEM))
				.isInstanceOf(FichaDadosSegurancaNaoEditavelException.class);
	}

	@Test
	void naoDevePermitirAtualizarDissocianatosForaDeRascunho() {
		FichaDadosSeguranca fds = fdsCompletaAtualizada();

		assertThatThrownBy(() -> fds.atualizarTemDissocianatos(true))
				.isInstanceOf(FichaDadosSegurancaNaoEditavelException.class);
	}

	@Test
	void deveReidratarPreservandoImagemEDissocianatos() {
		FDSId id = FDSId.gerar();

		FichaDadosSeguranca reidratada = FichaDadosSeguranca.reidratar(
				id, "Produto X", new Marca("3M"), null, null, null, null, null,
				IMAGEM, true, EstadoFDS.RASCUNHO
		);

		assertThat(reidratada.imagem()).isEqualTo(IMAGEM);
		assertThat(reidratada.temDissocianatos()).isTrue();
	}

	private static FichaDadosSeguranca fdsMinima() {
		return FichaDadosSeguranca.criarRascunho("Produto X", new Marca("3M"), null, null, null, null, null);
	}

	private static FichaDadosSeguranca fdsCompletaAtualizada() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto Completo", new Marca("3M"),
				FornecedorId.gerar(), new Email("a@x.pt"),
				new DataValidade(LocalDate.of(2026, 1, 1), LocalDate.of(2027, 1, 1)),
				java.util.Set.of(PictogramaPerigo.CORROSIVOS), null);
		fds.atualizarPara(EstadoFDS.ATUALIZADA);
		return fds;
	}
}
