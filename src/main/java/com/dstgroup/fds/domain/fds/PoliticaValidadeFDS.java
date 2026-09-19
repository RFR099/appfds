package com.dstgroup.fds.domain.fds;

import java.time.LocalDate;

/**
 * Domain service que decide se uma FDS deve transitar para
 * {@link EstadoFDS#OBSOLETA}, com base na comparação entre a
 * {@link DataValidade} e uma data de referência.
 *
 * <p>Tal como {@link DataValidade#estaExpirada}, nunca chama
 * {@code LocalDate.now()} internamente — recebe sempre a data de referência
 * por parâmetro. Quem decide "agora" é o chamador (o job agendado da Fase 3,
 * Parte 8), através de um {@code Clock} injetável, o que torna esta política
 * inteiramente determinística e testável sem esperas reais.</p>
 *
 * <p>Reutiliza a máquina de estados de {@link EstadoFDS} em vez de repetir a
 * regra "só transita se não estiver já Obsoleta": {@code podeTransitarPara}
 * já sabe que uma FDS em {@code RASCUNHO} nunca pode ir diretamente para
 * {@code OBSOLETA} — por isso um rascunho esquecido com uma Data de
 * Validade expirada nunca é marcado automaticamente, mesmo que a data já
 * tenha passado.</p>
 */
public final class PoliticaValidadeFDS {

	private PoliticaValidadeFDS() {
	}

	/**
	 * @return {@code true} se, na {@code dataReferencia} indicada, a FDS
	 * reúne as duas condições para ser marcada como Obsoleta: tem
	 * {@link DataValidade} definida e já expirada, e o seu estado atual
	 * permite essa transição (nunca {@code RASCUNHO}, nunca já
	 * {@code OBSOLETA}).
	 */
	public static boolean deveMarcarComoObsoleta(FichaDadosSeguranca fds, LocalDate dataReferencia) {
		DataValidade dataValidade = fds.dataValidade();
		if (dataValidade == null) {
			return false;
		}
		if (!fds.estado().podeTransitarPara(EstadoFDS.OBSOLETA)) {
			return false;
		}
		return dataValidade.estaExpirada(dataReferencia);
	}

	/**
	 * @param diasAntecedencia quantos dias antes da {@code DataValidade}
	 *                          expirar o alerta de pré-aviso deve começar a
	 *                          aparecer (RF09; parametrizável — ver
	 *                          {@code app.alertas.fds-dias-antecedencia}).
	 * @return {@code true} se, na {@code dataReferencia} indicada, a FDS está
	 * dentro da janela de alerta: tem {@link DataValidade} definida, o seu
	 * estado ainda permite transitar para {@link EstadoFDS#OBSOLETA}
	 * (mesma invariante de {@link #deveMarcarComoObsoleta}), e já entrou nos
	 * {@code diasAntecedencia} dias anteriores à validade — incluindo, de
	 * propósito, o período já expirado mas ainda não processado pelo job de
	 * obsolescência, que continua a merecer alerta e não menos atenção.
	 */
	public static boolean deveGerarAlertaPreAviso(FichaDadosSeguranca fds, LocalDate dataReferencia,
			int diasAntecedencia) {
		DataValidade dataValidade = fds.dataValidade();
		if (dataValidade == null) {
			return false;
		}
		if (!fds.estado().podeTransitarPara(EstadoFDS.OBSOLETA)) {
			return false;
		}
		LocalDate inicioJanelaDeAlerta = dataValidade.dataValidade().minusDays(diasAntecedencia);
		return !dataReferencia.isBefore(inicioJanelaDeAlerta);
	}
}
