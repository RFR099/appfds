package com.dstgroup.fds.domain.fds;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.EnumSet;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

class PictogramaPerigoTest {

	@Test
	void deveConterExatamenteNoveCategoriasDoProtocolo() {
		// As 9 categorias GHS/CLP tal como aparecem no protótipo do formulário
		// de criação de FDS (passo 2, secção "Pictogramas de Perigo").
		assertThat(PictogramaPerigo.values()).hasSize(9);
	}

	@Test
	void deveConterTodasAsCategoriasEspecificasDoPrototipo() {
		assertThat(PictogramaPerigo.values()).containsExactlyInAnyOrder(
				PictogramaPerigo.TOXICIDADE_AGUDA_1_2_3,
				PictogramaPerigo.TOXICIDADE_AGUDA_4_IRRITACAO_SENSIBILIZACAO,
				PictogramaPerigo.SENSIBILIZACAO_RESPIRATORIA_CMR,
				PictogramaPerigo.PERIGOSO_AMBIENTE_AQUATICO,
				PictogramaPerigo.EXPLOSIVOS,
				PictogramaPerigo.INFLAMAVEIS_PIROFORICOS,
				PictogramaPerigo.COMBURENTES,
				PictogramaPerigo.GASES_SOB_PRESSAO,
				PictogramaPerigo.CORROSIVOS
		);
	}

	@ParameterizedTest
	@EnumSource(PictogramaPerigo.class)
	void deveTerDescricaoLegivelNaoVaziaParaCadaCategoria(PictogramaPerigo pictograma) {
		assertThat(pictograma.descricao()).isNotBlank();
	}

	@Test
	void deveSerPossivelAssociarMultiplosPictogramasSemDuplicados() {
		Set<PictogramaPerigo> pictogramas = EnumSet.of(
				PictogramaPerigo.CORROSIVOS,
				PictogramaPerigo.EXPLOSIVOS,
				PictogramaPerigo.CORROSIVOS // duplicado intencional
		);

		assertThat(pictogramas).hasSize(2)
				.containsExactlyInAnyOrder(PictogramaPerigo.CORROSIVOS, PictogramaPerigo.EXPLOSIVOS);
	}

	@Test
	void deveManterOrdemDeDeclaracaoIgualAoPrototipo() {
		// Útil para a UI apresentar os pictogramas sempre na mesma ordem do
		// protótipo (2 linhas de checkboxes: 4 na primeira, 5 na segunda).
		assertThat(PictogramaPerigo.values()[0]).isEqualTo(PictogramaPerigo.TOXICIDADE_AGUDA_1_2_3);
		assertThat(PictogramaPerigo.values()[8]).isEqualTo(PictogramaPerigo.CORROSIVOS);
	}
}
