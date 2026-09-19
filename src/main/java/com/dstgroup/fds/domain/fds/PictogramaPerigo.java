package com.dstgroup.fds.domain.fds;

/**
 * As 9 categorias de perigo (pictogramas GHS/CLP — Regulamento (CE) 1272/2008)
 * apresentadas no formulário de criação de FDS, exatamente na mesma ordem em
 * que aparecem no protótipo (2 linhas de checkboxes: 4 + 5).
 *
 * <p>Um produto químico pode ter vários pictogramas associados — no agregado
 * {@code FichaDadosSeguranca} isto é modelado como {@code Set<PictogramaPerigo>}
 * (ou {@code EnumSet}), que já garante a ausência de duplicados por
 * construção.</p>
 */
public enum PictogramaPerigo {

	// --- primeira linha do protótipo ---
	TOXICIDADE_AGUDA_1_2_3("Toxicidade aguda cat 1, 2 e 3"),
	TOXICIDADE_AGUDA_4_IRRITACAO_SENSIBILIZACAO("Toxicidade aguda cat 4 / Irritação / Sensibilização pele-cutânea"),
	SENSIBILIZACAO_RESPIRATORIA_CMR("Sensibilização respiratória / CMR cat 1A, 1B e 2"),
	PERIGOSO_AMBIENTE_AQUATICO("Perigoso para o ambiente aquático"),

	// --- segunda linha do protótipo ---
	EXPLOSIVOS("Explosivos"),
	INFLAMAVEIS_PIROFORICOS("Inflamáveis / Pirofóricos"),
	COMBURENTES("Comburentes"),
	GASES_SOB_PRESSAO("Gases sob pressão"),
	CORROSIVOS("Corrosivos");

	private final String descricao;

	PictogramaPerigo(String descricao) {
		this.descricao = descricao;
	}

	/**
	 * @return descrição legível para apresentação na UI (ex.: tooltip, legenda).
	 */
	public String descricao() {
		return descricao;
	}
}
