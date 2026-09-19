package com.dstgroup.fds.domain.fds;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class ImagemProdutoTest {

	private static final long UM_MEGABYTE = 1024L * 1024L;

	@Test
	void deveAceitarImagemValida() {
		ImagemProduto imagem = new ImagemProduto("/uploads/fds/abc123.png", "image/png", UM_MEGABYTE);

		assertThat(imagem.caminho()).isEqualTo("/uploads/fds/abc123.png");
		assertThat(imagem.tipoMime()).isEqualTo("image/png");
		assertThat(imagem.tamanhoBytes()).isEqualTo(UM_MEGABYTE);
	}

	@ParameterizedTest
	@NullAndEmptySource
	@ValueSource(strings = { "   " })
	void deveRejeitarCaminhoNuloVazioOuEmBranco(String caminhoInvalido) {
		assertThatThrownBy(() -> new ImagemProduto(caminhoInvalido, "image/png", UM_MEGABYTE))
				.isInstanceOf(ImagemProdutoInvalidaException.class);
	}

	@ParameterizedTest
	@ValueSource(strings = { "application/pdf", "image/gif", "text/plain", "" })
	void deveRejeitarTipoMimeNaoSuportado(String tipoInvalido) {
		assertThatThrownBy(() -> new ImagemProduto("/uploads/fds/abc.png", tipoInvalido, UM_MEGABYTE))
				.isInstanceOf(ImagemProdutoInvalidaException.class)
				.hasMessageContaining(tipoInvalido);
	}

	@Test
	void deveRejeitarTipoMimeNulo() {
		assertThatThrownBy(() -> new ImagemProduto("/uploads/fds/abc.png", null, UM_MEGABYTE))
				.isInstanceOf(ImagemProdutoInvalidaException.class);
	}

	@Test
	void deveAceitarTiposMimeSuportados() {
		for (String tipo : new String[] { "image/png", "image/jpeg", "image/webp" }) {
			ImagemProduto imagem = new ImagemProduto("/uploads/fds/abc.png", tipo, UM_MEGABYTE);
			assertThat(imagem.tipoMime()).isEqualTo(tipo);
		}
	}

	@Test
	void deveRejeitarTamanhoZeroOuNegativo() {
		assertThatThrownBy(() -> new ImagemProduto("/uploads/fds/abc.png", "image/png", 0))
				.isInstanceOf(ImagemProdutoInvalidaException.class);
		assertThatThrownBy(() -> new ImagemProduto("/uploads/fds/abc.png", "image/png", -1))
				.isInstanceOf(ImagemProdutoInvalidaException.class);
	}

	@Test
	void deveRejeitarTamanhoAcimaDoLimiteMaximo() {
		long acimaDoLimite = 5 * 1024 * 1024 + 1; // limite é 5 MB

		assertThatThrownBy(() -> new ImagemProduto("/uploads/fds/abc.png", "image/png", acimaDoLimite))
				.isInstanceOf(ImagemProdutoInvalidaException.class);
	}

	@Test
	void deveAceitarExatamenteNoLimiteMaximo() {
		long noLimite = 5 * 1024 * 1024;

		ImagemProduto imagem = new ImagemProduto("/uploads/fds/abc.png", "image/png", noLimite);

		assertThat(imagem.tamanhoBytes()).isEqualTo(noLimite);
	}

	@Test
	void deveSerIgualPorValorNaoPorReferencia() {
		ImagemProduto a = new ImagemProduto("/uploads/fds/abc.png", "image/png", UM_MEGABYTE);
		ImagemProduto b = new ImagemProduto("/uploads/fds/abc.png", "image/png", UM_MEGABYTE);

		assertThat(a).isEqualTo(b);
		assertThat(a.hashCode()).isEqualTo(b.hashCode());
	}
}
