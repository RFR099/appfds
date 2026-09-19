package com.dstgroup.fds.domain.obra;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class CentroProdutivoTest {

	@Test
	void deveCriarComNomeELocalizacao() {
		CentroProdutivo centro = CentroProdutivo.criar("Fábrica Norte", "Braga");

		assertThat(centro.nome()).isEqualTo("Fábrica Norte");
		assertThat(centro.localizacao()).isEqualTo("Braga");
	}

	@Test
	void deveAceitarLocalizacaoNula() {
		CentroProdutivo centro = CentroProdutivo.criar("Fábrica Norte", null);

		assertThat(centro.localizacao()).isNull();
	}

	@Test
	void deveRejeitarNomeNuloOuVazio() {
		assertThatThrownBy(() -> CentroProdutivo.criar(null, "Braga"))
				.isInstanceOf(NomeCentroProdutivoInvalidoException.class);
		assertThatThrownBy(() -> CentroProdutivo.criar("   ", "Braga"))
				.isInstanceOf(NomeCentroProdutivoInvalidoException.class);
	}

	@Test
	void deveNormalizarEspacosEmBrancoDoNome() {
		CentroProdutivo centro = CentroProdutivo.criar("  Fábrica Norte  ", "Braga");

		assertThat(centro.nome()).isEqualTo("Fábrica Norte");
	}

	@Test
	void deveGerarIdUnicoParaCadaCentroCriado() {
		CentroProdutivo a = CentroProdutivo.criar("Fábrica Norte", "Braga");
		CentroProdutivo b = CentroProdutivo.criar("Fábrica Norte", "Braga");

		assertThat(a.id()).isNotEqualTo(b.id());
	}

	@Test
	void doisCentrosDiferentesNuncaSaoIguaisMesmoComOsMesmosDados() {
		CentroProdutivo a = CentroProdutivo.criar("Fábrica Norte", "Braga");
		CentroProdutivo b = CentroProdutivo.criar("Fábrica Norte", "Braga");

		assertThat(a).isNotEqualTo(b);
	}

	@Test
	void umCentroEIgualASiProprio() {
		CentroProdutivo centro = CentroProdutivo.criar("Fábrica Norte", "Braga");

		assertThat(centro).isEqualTo(centro);
	}

	@Test
	void deveReidratarPreservandoOIdReal() {
		CentroProdutivoId id = CentroProdutivoId.gerar();

		CentroProdutivo reidratado = CentroProdutivo.reidratar(id, "Fábrica Norte", "Braga");

		assertThat(reidratado.id()).isEqualTo(id);
		assertThat(reidratado.nome()).isEqualTo("Fábrica Norte");
	}
}
