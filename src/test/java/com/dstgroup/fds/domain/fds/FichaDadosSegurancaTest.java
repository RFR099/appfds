package com.dstgroup.fds.domain.fds;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.EnumSet;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.dstgroup.fds.domain.fornecedor.FornecedorId;
import com.dstgroup.fds.domain.shared.Email;

class FichaDadosSegurancaTest {

	private static final LocalDate REVISAO = LocalDate.of(2026, 1, 1);
	private static final LocalDate VALIDADE = LocalDate.of(2027, 1, 1);

	// --- Helpers para manter os testes legíveis (dados válidos por omissão) ---

	private FornecedorId umFornecedorId() {
		return FornecedorId.gerar();
	}

	private DataValidade umaDataValidade() {
		return new DataValidade(REVISAO, VALIDADE);
	}

	private Set<PictogramaPerigo> algunsPictogramas() {
		return EnumSet.of(PictogramaPerigo.CORROSIVOS);
	}

	// --- Criação como Rascunho ---

	@Test
	void deveCriarComoRascunhoComCamposMinimos() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho(
				"SprayMount(TM) Adhesive (PL-7874)", new Marca("3M"),
				null, null, null, null
		, null);

		assertThat(fds.estado()).isEqualTo(EstadoFDS.RASCUNHO);
		assertThat(fds.nomeProdutoQuimico()).isEqualTo("SprayMount(TM) Adhesive (PL-7874)");
		assertThat(fds.marca()).isEqualTo(new Marca("3M"));
		assertThat(fds.pictogramas()).isEmpty();
	}

	@Test
	void deveGerarIdUnicoParaCadaFDSCriada() {
		FichaDadosSeguranca a = FichaDadosSeguranca.criarRascunho("Produto A", new Marca("3M"), null, null, null, null, null);
		FichaDadosSeguranca b = FichaDadosSeguranca.criarRascunho("Produto B", new Marca("3M"), null, null, null, null, null);

		assertThat(a.id()).isNotEqualTo(b.id());
	}

	@Test
	void deveRejeitarNomeDeProdutoVazioOuNulo() {
		assertThatThrownBy(() -> FichaDadosSeguranca.criarRascunho(" ", new Marca("3M"), null, null, null, null, null))
				.isInstanceOf(NomeProdutoQuimicoInvalidoException.class);

		assertThatThrownBy(() -> FichaDadosSeguranca.criarRascunho(null, new Marca("3M"), null, null, null, null, null))
				.isInstanceOf(NomeProdutoQuimicoInvalidoException.class);
	}

	@Test
	void deveRejeitarMarcaNula() {
		assertThatThrownBy(() -> FichaDadosSeguranca.criarRascunho("Produto A", null, null, null, null, null, null))
				.isInstanceOf(NullPointerException.class);
	}

	@Test
	void devePermitirCriarRascunhoIncompletoParaRetomarMaisTarde() {
		// RF06: guardar como rascunho sem fornecedor, e-mail, validade ou pictogramas
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho(
				"Produto Incompleto", new Marca("MarcaX"), null, null, null, null
		, null);

		assertThat(fds.fornecedorId()).isNull();
		assertThat(fds.emailContacto()).isNull();
		assertThat(fds.dataValidade()).isNull();
	}

	// --- Saída de Rascunho (invariantes) ---

	@Test
	void deveTransitarDeRascunhoParaAtualizadaQuandoTodosOsCamposObrigatoriosEstaoPreenchidos() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho(
				"SOLIM D-SAN", new Marca("A2Brios"), umFornecedorId(),
				new Email("fornecedor@a2brios.pt"), umaDataValidade(), algunsPictogramas()
		, null);

		fds.atualizarPara(EstadoFDS.ATUALIZADA);

		assertThat(fds.estado()).isEqualTo(EstadoFDS.ATUALIZADA);
	}

	@Test
	void deveLancarExcecaoAoTentarSairDeRascunhoSemPictogramas() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho(
				"Produto Sem Pictograma", new Marca("MarcaX"), umFornecedorId(),
				new Email("fornecedor@marcax.pt"), umaDataValidade(), Set.of() // sem pictogramas
		, null);

		assertThatThrownBy(() -> fds.atualizarPara(EstadoFDS.ATUALIZADA))
				.isInstanceOf(FichaDadosSegurancaIncompletaException.class)
				.hasMessageContaining("Pictograma");

		// e o estado não deve ter mudado
		assertThat(fds.estado()).isEqualTo(EstadoFDS.RASCUNHO);
	}

	@Test
	void deveLancarExcecaoAoTentarSairDeRascunhoSemFornecedor() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho(
				"Produto Sem Fornecedor", new Marca("MarcaX"), null, // sem fornecedor
				new Email("alguem@marcax.pt"), umaDataValidade(), algunsPictogramas()
		, null);

		assertThatThrownBy(() -> fds.atualizarPara(EstadoFDS.ATUALIZADA))
				.isInstanceOf(FichaDadosSegurancaIncompletaException.class)
				.hasMessageContaining("Fornecedor");

		assertThat(fds.estado()).isEqualTo(EstadoFDS.RASCUNHO);
	}

	@Test
	void deveLancarExcecaoAoTentarSairDeRascunhoSemDataDeValidade() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho(
				"Produto Sem Validade", new Marca("MarcaX"), umFornecedorId(),
				new Email("alguem@marcax.pt"), null, algunsPictogramas() // sem data de validade
		, null);

		assertThatThrownBy(() -> fds.atualizarPara(EstadoFDS.ATUALIZADA))
				.isInstanceOf(FichaDadosSegurancaIncompletaException.class)
				.hasMessageContaining("Validade");

		assertThat(fds.estado()).isEqualTo(EstadoFDS.RASCUNHO);
	}

	@Test
	void naoDeveRevalidarCamposObrigatoriosEmTransicoesQueNaoSaemDeRascunho() {
		// uma vez completa e fora de Rascunho, novas transições (ex.: Atualizada -> Obsoleta)
		// não devem voltar a exigir pictogramas/fornecedor/validade — essa validação é
		// específica da saída do Rascunho.
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho(
				"Produto Completo", new Marca("MarcaX"), umFornecedorId(),
				new Email("alguem@marcax.pt"), umaDataValidade(), algunsPictogramas()
		, null);
		fds.atualizarPara(EstadoFDS.ATUALIZADA);

		fds.atualizarPara(EstadoFDS.OBSOLETA);

		assertThat(fds.estado()).isEqualTo(EstadoFDS.OBSOLETA);
	}

	@Test
	void deveRespeitarAMaquinaDeEstadosAoTentarTransicaoInvalida() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho(
				"Produto Completo", new Marca("MarcaX"), umFornecedorId(),
				new Email("alguem@marcax.pt"), umaDataValidade(), algunsPictogramas()
		, null);

		// Rascunho -> Obsoleta não é uma transição válida na máquina de estados
		assertThatThrownBy(() -> fds.atualizarPara(EstadoFDS.OBSOLETA))
				.isInstanceOf(TransicaoEstadoInvalidaException.class);
	}

	// --- Encapsulamento ---

	@Test
	void naoDevePermitirModificarPictogramasPorForaDoAgregado() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho(
				"Produto Completo", new Marca("MarcaX"), umFornecedorId(),
				new Email("alguem@marcax.pt"), umaDataValidade(), algunsPictogramas()
		, null);

		assertThatThrownBy(() -> fds.pictogramas().add(PictogramaPerigo.EXPLOSIVOS))
				.isInstanceOf(UnsupportedOperationException.class);
	}

	// --- Identidade ---

	@Test
	void duasFDSDiferentesNuncaSaoIguaisMesmoComOsMesmosDados() {
		FichaDadosSeguranca a = FichaDadosSeguranca.criarRascunho("Produto A", new Marca("3M"), null, null, null, null, null);
		FichaDadosSeguranca b = FichaDadosSeguranca.criarRascunho("Produto A", new Marca("3M"), null, null, null, null, null);

		assertThat(a).isNotEqualTo(b); // identidade por id, não por valor dos campos
	}

	@Test
	void umaFDSEIgualASiPropria() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto A", new Marca("3M"), null, null, null, null, null);

		assertThat(fds).isEqualTo(fds);
	}

	@Test
	void deveReidratarPreservandoIdEEstadoReaisSemEmitirEventos() {
		FDSId id = FDSId.gerar();
		com.dstgroup.fds.domain.fornecedor.FornecedorId fornecedorId = com.dstgroup.fds.domain.fornecedor.FornecedorId.gerar();
		DataValidade dataValidade = new DataValidade(java.time.LocalDate.of(2026, 1, 1), java.time.LocalDate.of(2027, 1, 1));

		FichaDadosSeguranca reidratada = FichaDadosSeguranca.reidratar(
				id, "SprayMount Adhesive", new Marca("3M"), fornecedorId, new Email("f@3m.com"),
				dataValidade, java.util.Set.of(PictogramaPerigo.CORROSIVOS), null, null, false, EstadoFDS.OBSOLETA
		);

		assertThat(reidratada.id()).isEqualTo(id);
		assertThat(reidratada.estado()).isEqualTo(EstadoFDS.OBSOLETA);
		assertThat(reidratada.pullDomainEvents(java.time.Instant.now(), null)).isEmpty();
	}
}
