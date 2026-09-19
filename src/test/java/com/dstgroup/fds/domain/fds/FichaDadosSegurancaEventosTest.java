package com.dstgroup.fds.domain.fds;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.dstgroup.fds.domain.fornecedor.FornecedorId;
import com.dstgroup.fds.domain.shared.DomainEvent;
import com.dstgroup.fds.domain.shared.Email;

class FichaDadosSegurancaEventosTest {

	private static final DataValidade DATA_VALIDADE =
			new DataValidade(LocalDate.of(2026, 1, 1), LocalDate.of(2027, 1, 1));

	/**
	 * Fixo (Fase 5, Parte 2) — antes desta parte, {@code pullDomainEvents()}
	 * não recebia nenhum instante (o agregado chamava {@code Instant.now()}
	 * internamente) e este teste só conseguia verificar que o timestamp
	 * estava "entre antes e depois" da chamada, nunca um valor exato.
	 */
	private static final Instant AGORA = Instant.parse("2026-06-01T10:00:00Z");

	/**
	 * (Fase 5, Parte 2) — {@code pullDomainEvents} passou a receber também o
	 * utilizador autenticado (RF12/RNF03, "quem alterou"), materializado nos
	 * eventos pendentes só nesta chamada (fábricas adiadas).
	 */
	private static final String UTILIZADOR = "gestor.dev";

	@Test
	void deveEmitirFDSCriadaEventAoCriar() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto A", new Marca("3M"),
				null, null, null, null, null);

		List<DomainEvent> eventos = fds.pullDomainEvents(AGORA, UTILIZADOR);

		assertThat(eventos).hasSize(1);
		assertThat(eventos.get(0)).isInstanceOf(FDSCriadaEvent.class);
		FDSCriadaEvent evento = (FDSCriadaEvent) eventos.get(0);
		assertThat(evento.fdsId()).isEqualTo(fds.id());
		assertThat(evento.ocorridoEm()).isEqualTo(AGORA);
	}

	@Test
	void pullDomainEventsDeveLimparAListaAposChamada() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto A", new Marca("3M"),
				null, null, null, null, null);

		List<DomainEvent> primeiraChamada = fds.pullDomainEvents(AGORA, UTILIZADOR);
		List<DomainEvent> segundaChamada = fds.pullDomainEvents(AGORA, UTILIZADOR);

		assertThat(primeiraChamada).hasSize(1);
		assertThat(segundaChamada).isEmpty();
	}

	@Test
	void deveRejeitarInstanteNulo() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto A", new Marca("3M"),
				null, null, null, null, null);

		assertThatThrownBy(() -> fds.pullDomainEvents(null, UTILIZADOR))
				.isInstanceOf(NullPointerException.class);
	}

	@Test
	void deveEmitirFDSEstadoAlteradoEventAoTransitarComSucesso() {
		FichaDadosSeguranca fds = fdsCompleta();
		fds.pullDomainEvents(AGORA, UTILIZADOR); // descarta o FDSCriadaEvent da criação, para isolar este teste

		fds.atualizarPara(EstadoFDS.ATUALIZADA);
		List<DomainEvent> eventos = fds.pullDomainEvents(AGORA, UTILIZADOR);

		assertThat(eventos).hasSize(1);
		assertThat(eventos.get(0)).isInstanceOf(FDSEstadoAlteradoEvent.class);
		FDSEstadoAlteradoEvent evento = (FDSEstadoAlteradoEvent) eventos.get(0);
		assertThat(evento.fdsId()).isEqualTo(fds.id());
		assertThat(evento.estadoAnterior()).isEqualTo(EstadoFDS.RASCUNHO);
		assertThat(evento.estadoNovo()).isEqualTo(EstadoFDS.ATUALIZADA);
		assertThat(evento.ocorridoEm()).isEqualTo(AGORA);
	}

	@Test
	void deveIncluirOUtilizadorRecebidoNoEventoDeAlteracaoDeEstado() {
		// Prova de que o utilizador passado a pullDomainEvents() — não o
		// momento de criarRascunho()/atualizarPara() — é o que acaba no
		// evento: a fábrica é adiada precisamente para permitir isto.
		FichaDadosSeguranca fds = fdsCompleta();
		fds.pullDomainEvents(AGORA, UTILIZADOR);

		fds.atualizarPara(EstadoFDS.ATUALIZADA);
		FDSEstadoAlteradoEvent evento = (FDSEstadoAlteradoEvent) fds.pullDomainEvents(AGORA, "outro.utilizador").get(0);

		assertThat(evento.utilizador()).isEqualTo("outro.utilizador");
	}

	@Test
	void deveAceitarUtilizadorNuloQuandoNaoHaUtilizadorAutenticado() {
		// Legítimo para transições despoletadas por processos automáticos
		// (ex.: MarcarFDSObsoletasUseCase, o job agendado) — ver
		// AutenticacaoPort#utilizadorAtual().
		FichaDadosSeguranca fds = fdsCompleta();
		fds.pullDomainEvents(AGORA, UTILIZADOR);

		fds.atualizarPara(EstadoFDS.ATUALIZADA);
		FDSEstadoAlteradoEvent evento = (FDSEstadoAlteradoEvent) fds.pullDomainEvents(AGORA, null).get(0);

		assertThat(evento.utilizador()).isNull();
	}

	@Test
	void naoDeveEmitirEventoQuandoTransicaoEInvalidaPelaMaquinaDeEstados() {
		FichaDadosSeguranca fds = fdsCompleta();
		fds.pullDomainEvents(AGORA, UTILIZADOR);

		try {
			fds.atualizarPara(EstadoFDS.OBSOLETA); // RASCUNHO -> OBSOLETA é inválido
		} catch (TransicaoEstadoInvalidaException esperado) {
			// ignorado — o que interessa é o efeito colateral (ausência de evento)
		}

		assertThat(fds.pullDomainEvents(AGORA, UTILIZADOR)).isEmpty();
	}

	@Test
	void naoDeveEmitirEventoQuandoFaltamCamposObrigatoriosParaSairDeRascunho() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("X", new Marca("MarcaX"),
				null, null, null, null, null);
		fds.pullDomainEvents(AGORA, UTILIZADOR);

		try {
			fds.atualizarPara(EstadoFDS.ATUALIZADA);
		} catch (FichaDadosSegurancaIncompletaException esperado) {
			// ignorado
		}

		assertThat(fds.pullDomainEvents(AGORA, UTILIZADOR)).isEmpty();
	}

	private static FichaDadosSeguranca fdsCompleta() {
		return FichaDadosSeguranca.criarRascunho("Produto Completo", new Marca("MarcaX"), FornecedorId.gerar(),
				new Email("a@x.pt"), DATA_VALIDADE, EnumSet.of(PictogramaPerigo.CORROSIVOS), null);
	}
}
