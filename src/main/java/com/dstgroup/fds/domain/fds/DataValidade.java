package com.dstgroup.fds.domain.fds;

import java.time.LocalDate;

/**
 * Value Object que agrupa a Data de Revisão e a Data de Validade de uma FDS,
 * garantindo por construção que a segunda é sempre posterior à primeira.
 *
 * <p><b>Decisão de negócio confirmada</b>: a Data de Validade é sempre
 * explícita (preenchida pelo utilizador/fornecedor), nunca calculada
 * implicitamente a partir da Data de Revisão (ex.: "+3 anos"). Este VO só
 * valida a <i>relação</i> entre as duas datas.</p>
 *
 * <p>Nunca chama {@code LocalDate.now()} internamente — {@link #estaExpirada}
 * recebe sempre a data de referência por parâmetro, o que torna o VO
 * totalmente determinístico e fácil de testar (ver também o uso de
 * {@code Clock} recomendado no domain service {@code PoliticaValidadeFDS},
 * que chama este método).</p>
 */
public record DataValidade(LocalDate dataRevisao, LocalDate dataValidade) {

	public DataValidade {
		if (dataRevisao == null) {
			throw new DataValidadeInvalidaException("A data de revisão é obrigatória.");
		}
		if (dataValidade == null) {
			throw new DataValidadeInvalidaException("A data de validade é obrigatória.");
		}
		if (!dataValidade.isAfter(dataRevisao)) {
			throw new DataValidadeInvalidaException(
					"A data de validade (" + dataValidade + ") deve ser posterior à data de revisão ("
							+ dataRevisao + ")."
			);
		}
	}

	/**
	 * @param dataReferencia a data a comparar (tipicamente "hoje", mas recebida
	 *                       por parâmetro para manter o VO testável e determinístico)
	 * @return {@code true} se {@code dataReferencia} for posterior à data de
	 * validade — a FDS mantém-se válida no próprio dia da data de validade.
	 */
	public boolean estaExpirada(LocalDate dataReferencia) {
		return dataReferencia.isAfter(dataValidade);
	}
}
