package com.dstgroup.fds.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.dstgroup.fds.application.dto.FiltroFDS;
import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.port.out.AutenticacaoPort;
import com.dstgroup.fds.application.port.out.EventPublisherPort;
import com.dstgroup.fds.application.port.out.FDSRepositoryPort;
import com.dstgroup.fds.domain.fds.DataValidade;
import com.dstgroup.fds.domain.fds.EstadoFDS;
import com.dstgroup.fds.domain.fds.FDSEstadoAlteradoEvent;
import com.dstgroup.fds.domain.fds.FDSId;
import com.dstgroup.fds.domain.fds.FichaDadosSeguranca;
import com.dstgroup.fds.domain.fds.Marca;
import com.dstgroup.fds.domain.fds.PictogramaPerigo;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;
import com.dstgroup.fds.domain.shared.DomainEvent;
import com.dstgroup.fds.domain.shared.Email;

class MarcarFDSObsoletasUseCaseTest {

	private static final LocalDate REVISAO = LocalDate.of(2026, 1, 1);
	private static final LocalDate VALIDADE = LocalDate.of(2027, 1, 1);

	/** "Hoje" congelado um dia depois da validade — as candidatas já expiraram. */
	private static final Clock RELOGIO_APOS_EXPIRACAO =
			Clock.fixed(VALIDADE.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant(), ZoneOffset.UTC);

	/** "Hoje" congelado antes da validade — nada deve ser marcado. */
	private static final Clock RELOGIO_ANTES_DA_EXPIRACAO =
			Clock.fixed(VALIDADE.minusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant(), ZoneOffset.UTC);

	/**
	 * (Fase 5, Parte 2) — este caso de uso corre num job agendado, sem
	 * nenhum utilizador humano por trás: replica fielmente o que
	 * {@code SpringSecurityAutenticacaoAdapter#utilizadorAtual()} devolve
	 * numa thread sem {@code SecurityContext} (nunca um caso especial).
	 */
	private static final AutenticacaoPort SEM_UTILIZADOR_AUTENTICADO = Optional::empty;

	@Test
	void deveMarcarComoObsoletaAsCandidatasExpiradas() {
		FichaDadosSeguranca fds = fdsAtualizadaComValidade();
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(List.of(fds));
		MarcarFDSObsoletasUseCase useCase = new MarcarFDSObsoletasUseCase(repositorio, new EventPublisherPortFalso(),
				RELOGIO_APOS_EXPIRACAO, SEM_UTILIZADOR_AUTENTICADO);

		int marcadas = useCase.executar();

		assertThat(marcadas).isEqualTo(1);
		assertThat(fds.estado()).isEqualTo(EstadoFDS.OBSOLETA);
		assertThat(repositorio.guardadas).containsExactly(fds);
	}

	@Test
	void naoDeveMarcarNadaSeAindaNaoExpirou() {
		FichaDadosSeguranca fds = fdsAtualizadaComValidade();
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(List.of(fds));
		MarcarFDSObsoletasUseCase useCase = new MarcarFDSObsoletasUseCase(repositorio, new EventPublisherPortFalso(),
				RELOGIO_ANTES_DA_EXPIRACAO, SEM_UTILIZADOR_AUTENTICADO);

		int marcadas = useCase.executar();

		assertThat(marcadas).isZero();
		assertThat(fds.estado()).isEqualTo(EstadoFDS.ATUALIZADA);
		assertThat(repositorio.guardadas).isEmpty();
	}

	@Test
	void deveProcessarVariasCandidatasEMarcarApenasAsElegiveis() {
		FichaDadosSeguranca expirada = fdsAtualizadaComValidade();
		FichaDadosSeguranca aindaValida = FichaDadosSeguranca.criarRascunho("Produto B", new Marca("3M"),
				FornecedorId.gerar(), new Email("b@x.pt"),
				new DataValidade(REVISAO, VALIDADE.plusYears(5)), Set.of(PictogramaPerigo.CORROSIVOS), null);
		aindaValida.atualizarPara(EstadoFDS.ATUALIZADA);

		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(List.of(expirada, aindaValida));
		MarcarFDSObsoletasUseCase useCase = new MarcarFDSObsoletasUseCase(repositorio, new EventPublisherPortFalso(),
				RELOGIO_APOS_EXPIRACAO, SEM_UTILIZADOR_AUTENTICADO);

		int marcadas = useCase.executar();

		assertThat(marcadas).isEqualTo(1);
		assertThat(expirada.estado()).isEqualTo(EstadoFDS.OBSOLETA);
		assertThat(aindaValida.estado()).isEqualTo(EstadoFDS.ATUALIZADA);
	}

	@Test
	void deveDevolverZeroQuandoNaoHaCandidatas() {
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(List.of());
		MarcarFDSObsoletasUseCase useCase = new MarcarFDSObsoletasUseCase(repositorio, new EventPublisherPortFalso(),
				RELOGIO_APOS_EXPIRACAO, SEM_UTILIZADOR_AUTENTICADO);

		int marcadas = useCase.executar();

		assertThat(marcadas).isZero();
	}

	@Test
	void devePublicarFDSEstadoAlteradoEventParaCadaFDSMarcada() {
		FichaDadosSeguranca fds = fdsAtualizadaComValidade();
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(List.of(fds));
		EventPublisherPortFalso publicador = new EventPublisherPortFalso();
		MarcarFDSObsoletasUseCase useCase = new MarcarFDSObsoletasUseCase(repositorio, publicador,
				RELOGIO_APOS_EXPIRACAO, SEM_UTILIZADOR_AUTENTICADO);

		useCase.executar();

		assertThat(publicador.eventosPublicados).hasSize(1);
		assertThat(publicador.eventosPublicados.get(0)).isInstanceOf(FDSEstadoAlteradoEvent.class);
		FDSEstadoAlteradoEvent evento = (FDSEstadoAlteradoEvent) publicador.eventosPublicados.get(0);
		assertThat(evento.estadoAnterior()).isEqualTo(EstadoFDS.ATUALIZADA);
		assertThat(evento.estadoNovo()).isEqualTo(EstadoFDS.OBSOLETA);
	}

	@Test
	void deveEmitirEventoSemUtilizadorPorqueEUmProcessoAutomatico() {
		// A prova central da Parte 2 para este caso de uso: mesmo com a
		// cadeia de identidade (AutenticacaoPort) já ligada, o resultado
		// aqui tem de continuar a ser null — é o próprio sistema, não uma
		// pessoa, a marcar a FDS como obsoleta (RF12/RNF03).
		FichaDadosSeguranca fds = fdsAtualizadaComValidade();
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(List.of(fds));
		EventPublisherPortFalso publicador = new EventPublisherPortFalso();
		MarcarFDSObsoletasUseCase useCase = new MarcarFDSObsoletasUseCase(repositorio, publicador,
				RELOGIO_APOS_EXPIRACAO, SEM_UTILIZADOR_AUTENTICADO);

		useCase.executar();

		FDSEstadoAlteradoEvent evento = (FDSEstadoAlteradoEvent) publicador.eventosPublicados.get(0);
		assertThat(evento.utilizador()).isNull();
	}

	@Test
	void naoDevePublicarNadaSeNenhumaCandidataForMarcada() {
		FichaDadosSeguranca fds = fdsAtualizadaComValidade();
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(List.of(fds));
		EventPublisherPortFalso publicador = new EventPublisherPortFalso();
		MarcarFDSObsoletasUseCase useCase = new MarcarFDSObsoletasUseCase(repositorio, publicador,
				RELOGIO_ANTES_DA_EXPIRACAO, SEM_UTILIZADOR_AUTENTICADO);

		useCase.executar();

		assertThat(publicador.eventosPublicados).isEmpty();
	}

	private static FichaDadosSeguranca fdsAtualizadaComValidade() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto A", new Marca("3M"),
				FornecedorId.gerar(), new Email("a@x.pt"),
				new DataValidade(REVISAO, VALIDADE), Set.of(PictogramaPerigo.CORROSIVOS), null);
		fds.atualizarPara(EstadoFDS.ATUALIZADA);
		// Drena os eventos gerados pela própria preparação do fixture (criação +
		// transição para ATUALIZADA), simulando uma FDS já persistida antes do
		// caso de uso em teste correr — só assim os testes que verificam os
		// eventos publicados pelo caso de uso veem apenas os dele.
		fds.pullDomainEvents(Instant.now(RELOGIO_APOS_EXPIRACAO), null);
		return fds;
	}

	private static class FDSRepositoryPortFalso implements FDSRepositoryPort {
		private final List<FichaDadosSeguranca> candidatas;
		private final List<FichaDadosSeguranca> guardadas = new ArrayList<>();

		FDSRepositoryPortFalso(List<FichaDadosSeguranca> candidatas) {
			this.candidatas = candidatas;
		}

		@Override
		public boolean existeDuplicado(String nomeProdutoQuimico, Marca marca, FornecedorId fornecedorId) {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}

		@Override
		public void guardar(FichaDadosSeguranca fds) {
			guardadas.add(fds);
		}

		@Override
		public Optional<FichaDadosSeguranca> obterPorId(FDSId id) {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}

		@Override
		public Pagina<FichaDadosSeguranca> listar(FiltroFDS filtro, int pagina, int tamanho) {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}

		@Override
		public List<FichaDadosSeguranca> listarCandidatasAObsolescencia() {
			return candidatas;
		}
	}

	private static class EventPublisherPortFalso implements EventPublisherPort {
		private final List<DomainEvent> eventosPublicados = new ArrayList<>();

		@Override
		public void publicar(List<DomainEvent> eventos) {
			eventosPublicados.addAll(eventos);
		}
	}
}
