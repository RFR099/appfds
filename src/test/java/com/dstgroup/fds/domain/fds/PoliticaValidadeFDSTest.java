package com.dstgroup.fds.domain.fds;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.dstgroup.fds.domain.fornecedor.FornecedorId;
import com.dstgroup.fds.domain.shared.Email;

class PoliticaValidadeFDSTest {

	private static final LocalDate REVISAO = LocalDate.of(2026, 1, 1);
	private static final LocalDate VALIDADE = LocalDate.of(2027, 1, 1);

	@Test
	void naoDeveMarcarComoObsoletaSeNaoTemDataValidade() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto X", new Marca("3M"),
				null, null, null, null, null);

		boolean resultado = PoliticaValidadeFDS.deveMarcarComoObsoleta(fds, VALIDADE.plusYears(10));

		assertThat(resultado).isFalse();
	}

	@Test
	void naoDeveMarcarComoObsoletaSeAindaNaoExpirou() {
		FichaDadosSeguranca fds = fdsAtualizadaComValidade();

		boolean resultado = PoliticaValidadeFDS.deveMarcarComoObsoleta(fds, VALIDADE.minusDays(1));

		assertThat(resultado).isFalse();
	}

	@Test
	void naoDeveMarcarComoObsoletaNoProprioDiaDaValidade() {
		FichaDadosSeguranca fds = fdsAtualizadaComValidade();

		boolean resultado = PoliticaValidadeFDS.deveMarcarComoObsoleta(fds, VALIDADE);

		assertThat(resultado).isFalse();
	}

	@Test
	void deveMarcarComoObsoletaNoDiaSeguinteAExpiracaoQuandoEstadoEAtualizada() {
		FichaDadosSeguranca fds = fdsAtualizadaComValidade();

		boolean resultado = PoliticaValidadeFDS.deveMarcarComoObsoleta(fds, VALIDADE.plusDays(1));

		assertThat(resultado).isTrue();
	}

	@Test
	void deveMarcarComoObsoletaQuandoEstadoESolicitadaAoFornecedor() {
		FichaDadosSeguranca fds = fdsCompleta();
		fds.atualizarPara(EstadoFDS.SOLICITADA_AO_FORNECEDOR);

		boolean resultado = PoliticaValidadeFDS.deveMarcarComoObsoleta(fds, VALIDADE.plusDays(1));

		assertThat(resultado).isTrue();
	}

	@Test
	void naoDeveMarcarComoObsoletaSeJaEstaObsoleta() {
		FichaDadosSeguranca fds = fdsAtualizadaComValidade();
		fds.atualizarPara(EstadoFDS.OBSOLETA);

		boolean resultado = PoliticaValidadeFDS.deveMarcarComoObsoleta(fds, VALIDADE.plusDays(1));

		assertThat(resultado).isFalse();
	}

	@Test
	void naoDeveMarcarComoObsoletaSeEstaEmRascunhoMesmoComDataExpirada() {
		// invariante importante: mesmo com DataValidade definida e expirada,
		// uma FDS em RASCUNHO nunca é elegível — a transição direta
		// RASCUNHO -> OBSOLETA é proibida pela máquina de estados (Parte 3
		// da Fase 1), e esta política respeita-a em vez de a contornar.
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto X", new Marca("3M"),
				FornecedorId.gerar(), new Email("a@x.pt"),
				new DataValidade(REVISAO, VALIDADE), Set.of(PictogramaPerigo.CORROSIVOS), null);

		boolean resultado = PoliticaValidadeFDS.deveMarcarComoObsoleta(fds, VALIDADE.plusYears(10));

		assertThat(resultado).isFalse();
	}

	@Test
	void naoDeveGerarAlertaPreAvisoSeNaoTemDataValidade() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto X", new Marca("3M"),
				null, null, null, null, null);

		boolean resultado = PoliticaValidadeFDS.deveGerarAlertaPreAviso(fds, VALIDADE, 30);

		assertThat(resultado).isFalse();
	}

	@Test
	void naoDeveGerarAlertaPreAvisoForaDaJanelaDeAntecedencia() {
		FichaDadosSeguranca fds = fdsAtualizadaComValidade();

		// 31 dias antes da validade, com janela de 30 dias -> ainda não entrou
		boolean resultado = PoliticaValidadeFDS.deveGerarAlertaPreAviso(fds, VALIDADE.minusDays(31), 30);

		assertThat(resultado).isFalse();
	}

	@Test
	void deveGerarAlertaPreAvisoNoPrimeiroDiaDaJanelaDeAntecedencia() {
		FichaDadosSeguranca fds = fdsAtualizadaComValidade();

		boolean resultado = PoliticaValidadeFDS.deveGerarAlertaPreAviso(fds, VALIDADE.minusDays(30), 30);

		assertThat(resultado).isTrue();
	}

	@Test
	void deveGerarAlertaPreAvisoNoProprioDiaDaValidade() {
		FichaDadosSeguranca fds = fdsAtualizadaComValidade();

		boolean resultado = PoliticaValidadeFDS.deveGerarAlertaPreAviso(fds, VALIDADE, 30);

		assertThat(resultado).isTrue();
	}

	@Test
	void deveContinuarAGerarAlertaPreAvisoDepoisDeExpiradaEnquantoNaoForMarcadaObsoleta() {
		// janela "aberta": uma FDS expirada mas ainda não processada pelo job
		// de obsolescência (ex.: expirou há poucas horas, job ainda não
		// correu) continua a alertar — é precisamente esse o cenário que
		// precisa de atenção, não menos do que o pré-aviso.
		FichaDadosSeguranca fds = fdsAtualizadaComValidade();

		boolean resultado = PoliticaValidadeFDS.deveGerarAlertaPreAviso(fds, VALIDADE.plusDays(5), 30);

		assertThat(resultado).isTrue();
	}

	@Test
	void naoDeveGerarAlertaPreAvisoSeJaEstaObsoleta() {
		FichaDadosSeguranca fds = fdsAtualizadaComValidade();
		fds.atualizarPara(EstadoFDS.OBSOLETA);

		boolean resultado = PoliticaValidadeFDS.deveGerarAlertaPreAviso(fds, VALIDADE.plusDays(1), 30);

		assertThat(resultado).isFalse();
	}

	@Test
	void naoDeveGerarAlertaPreAvisoSeEstaEmRascunhoMesmoDentroDaJanela() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto X", new Marca("3M"),
				FornecedorId.gerar(), new Email("a@x.pt"),
				new DataValidade(REVISAO, VALIDADE), Set.of(PictogramaPerigo.CORROSIVOS), null);

		boolean resultado = PoliticaValidadeFDS.deveGerarAlertaPreAviso(fds, VALIDADE, 30);

		assertThat(resultado).isFalse();
	}

	private static FichaDadosSeguranca fdsCompleta() {
		return FichaDadosSeguranca.criarRascunho("Produto X", new Marca("3M"),
				FornecedorId.gerar(), new Email("a@x.pt"),
				new DataValidade(REVISAO, VALIDADE), Set.of(PictogramaPerigo.CORROSIVOS), null);
	}

	private static FichaDadosSeguranca fdsAtualizadaComValidade() {
		FichaDadosSeguranca fds = fdsCompleta();
		fds.atualizarPara(EstadoFDS.ATUALIZADA);
		return fds;
	}
}
