package com.dstgroup.fds.domain.obra;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class ObraTest {

	@Test
	void deveCriarComNomeECentroProdutivo() {
		CentroProdutivoId centroId = CentroProdutivoId.gerar();

		Obra obra = Obra.criar("Estaleiro Ponte Norte", centroId);

		assertThat(obra.nome()).isEqualTo("Estaleiro Ponte Norte");
		assertThat(obra.centroProdutivoId()).isEqualTo(centroId);
	}

	@Test
	void deveRejeitarNomeNuloOuVazio() {
		CentroProdutivoId centroId = CentroProdutivoId.gerar();

		assertThatThrownBy(() -> Obra.criar(null, centroId))
				.isInstanceOf(NomeObraInvalidoException.class);
		assertThatThrownBy(() -> Obra.criar("   ", centroId))
				.isInstanceOf(NomeObraInvalidoException.class);
	}

	@Test
	void deveRejeitarCentroProdutivoNulo() {
		assertThatThrownBy(() -> Obra.criar("Estaleiro Ponte Norte", null))
				.isInstanceOf(NullPointerException.class);
	}

	@Test
	void deveNormalizarEspacosEmBrancoDoNome() {
		Obra obra = Obra.criar("  Estaleiro Ponte Norte  ", CentroProdutivoId.gerar());

		assertThat(obra.nome()).isEqualTo("Estaleiro Ponte Norte");
	}

	@Test
	void deveGerarIdUnicoParaCadaObraCriada() {
		CentroProdutivoId centroId = CentroProdutivoId.gerar();
		Obra a = Obra.criar("Estaleiro A", centroId);
		Obra b = Obra.criar("Estaleiro A", centroId);

		assertThat(a.id()).isNotEqualTo(b.id());
	}

	@Test
	void duasObrasDiferentesNuncaSaoIguaisMesmoComOsMesmosDados() {
		CentroProdutivoId centroId = CentroProdutivoId.gerar();
		Obra a = Obra.criar("Estaleiro A", centroId);
		Obra b = Obra.criar("Estaleiro A", centroId);

		assertThat(a).isNotEqualTo(b);
	}

	@Test
	void umaObraEIgualASiPropria() {
		Obra obra = Obra.criar("Estaleiro A", CentroProdutivoId.gerar());

		assertThat(obra).isEqualTo(obra);
	}

	@Test
	void deveReidratarPreservandoOIdReal() {
		ObraId id = ObraId.gerar();
		CentroProdutivoId centroId = CentroProdutivoId.gerar();

		Obra reidratada = Obra.reidratar(id, "Estaleiro A", centroId);

		assertThat(reidratada.id()).isEqualTo(id);
		assertThat(reidratada.centroProdutivoId()).isEqualTo(centroId);
	}
}
