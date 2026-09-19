package com.dstgroup.fds.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import com.dstgroup.fds.application.dto.AtualizarFDSCommand;
import com.dstgroup.fds.application.dto.FDSResponse;
import com.dstgroup.fds.application.dto.FiltroFDS;
import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.port.out.AutenticacaoPort;
import com.dstgroup.fds.application.port.out.EventPublisherPort;
import com.dstgroup.fds.application.port.out.FDSRepositoryPort;
import com.dstgroup.fds.domain.fds.DataValidade;
import com.dstgroup.fds.domain.fds.EstadoFDS;
import com.dstgroup.fds.domain.fds.FDSId;
import com.dstgroup.fds.domain.fds.FDSNaoEncontradaException;
import com.dstgroup.fds.domain.fds.FichaDadosSeguranca;
import com.dstgroup.fds.domain.fds.FichaDadosSegurancaNaoEditavelException;
import com.dstgroup.fds.domain.fds.Marca;
import com.dstgroup.fds.domain.fds.PictogramaPerigo;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;
import com.dstgroup.fds.domain.shared.DomainEvent;
import com.dstgroup.fds.domain.shared.Email;

class AtualizarFDSUseCaseTest {

	/** Fixo (Fase 5, Parte 2) — o valor em si é irrelevante nestes testes, só a determinismo do construtor. */
	private static final Clock RELOGIO_FIXO = Clock.fixed(Instant.parse("2026-06-01T10:00:00Z"), ZoneOffset.UTC);
	private static final AutenticacaoPort AUTENTICACAO_FALSA = new AutenticacaoPortFalso("gestor.dev");

	@Test
	void deveAtualizarMarcaQuandoFornecida() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto X", new Marca("3M"),
				null, null, null, null, null);
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(fds);
		AtualizarFDSUseCase useCase = new AtualizarFDSUseCase(repositorio, new EventPublisherPortFalso(), RELOGIO_FIXO,
				AUTENTICACAO_FALSA);

		FDSResponse resposta = useCase.executar(
				new AtualizarFDSCommand(fds.id().toString(), "A2Brios", null, null, null, null, null));

		assertThat(resposta.marca()).isEqualTo("A2Brios");
		assertThat(repositorio.foiGuardada).isTrue();
	}

	@Test
	void naoDeveAlterarCamposNaoFornecidos() {
		FornecedorId fornecedorOriginal = FornecedorId.gerar();
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto X", new Marca("3M"),
				fornecedorOriginal, new Email("original@x.pt"), null, null, null);
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(fds);
		AtualizarFDSUseCase useCase = new AtualizarFDSUseCase(repositorio, new EventPublisherPortFalso(), RELOGIO_FIXO,
				AUTENTICACAO_FALSA);

		useCase.executar(new AtualizarFDSCommand(fds.id().toString(), "A2Brios", null, null, null, null, null));

		assertThat(fds.fornecedorId()).isEqualTo(fornecedorOriginal);
		assertThat(fds.emailContacto()).isEqualTo(new Email("original@x.pt"));
	}

	@Test
	void deveAtualizarFornecedorQuandoFornecido() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto X", new Marca("3M"),
				null, null, null, null, null);
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(fds);
		AtualizarFDSUseCase useCase = new AtualizarFDSUseCase(repositorio, new EventPublisherPortFalso(), RELOGIO_FIXO,
				AUTENTICACAO_FALSA);
		String novoFornecedorId = FornecedorId.gerar().valor().toString();

		FDSResponse resposta = useCase.executar(
				new AtualizarFDSCommand(fds.id().toString(), null, novoFornecedorId, null, null, null, null));

		assertThat(resposta.fornecedorId()).isEqualTo(novoFornecedorId);
	}

	@Test
	void deveAtualizarDataValidadeSoQuandoAmbasAsDatasSaoFornecidas() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto X", new Marca("3M"),
				null, null, null, null, null);
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(fds);
		AtualizarFDSUseCase useCase = new AtualizarFDSUseCase(repositorio, new EventPublisherPortFalso(), RELOGIO_FIXO,
				AUTENTICACAO_FALSA);

		// só a data de revisão, sem validade -> não deve tentar atualizar
		useCase.executar(new AtualizarFDSCommand(fds.id().toString(), null, null, null,
				LocalDate.of(2026, 1, 1), null, null));
		assertThat(fds.dataValidade()).isNull();

		// as duas -> atualiza
		useCase.executar(new AtualizarFDSCommand(fds.id().toString(), null, null, null,
				LocalDate.of(2026, 1, 1), LocalDate.of(2027, 1, 1), null));
		assertThat(fds.dataValidade()).isEqualTo(
				new DataValidade(LocalDate.of(2026, 1, 1), LocalDate.of(2027, 1, 1)));
	}

	@Test
	void deveReconciliarPictogramasAdicionandoERemovendo() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto X", new Marca("3M"),
				null, null, null, Set.of(PictogramaPerigo.CORROSIVOS, PictogramaPerigo.EXPLOSIVOS), null);
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(fds);
		AtualizarFDSUseCase useCase = new AtualizarFDSUseCase(repositorio, new EventPublisherPortFalso(), RELOGIO_FIXO,
				AUTENTICACAO_FALSA);

		// remove EXPLOSIVOS, mantém CORROSIVOS, adiciona GASES_SOB_PRESSAO
		FDSResponse resposta = useCase.executar(new AtualizarFDSCommand(fds.id().toString(), null, null, null,
				null, null, Set.of(PictogramaPerigo.CORROSIVOS, PictogramaPerigo.GASES_SOB_PRESSAO)));

		assertThat(resposta.pictogramas()).containsExactlyInAnyOrder(
				PictogramaPerigo.CORROSIVOS.name(), PictogramaPerigo.GASES_SOB_PRESSAO.name());
	}

	@Test
	void deveLancarExcecaoQuandoFDSNaoExiste() {
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(null);
		AtualizarFDSUseCase useCase = new AtualizarFDSUseCase(repositorio, new EventPublisherPortFalso(), RELOGIO_FIXO,
				AUTENTICACAO_FALSA);
		String idInexistente = UUID.randomUUID().toString();

		assertThatThrownBy(() -> useCase.executar(
				new AtualizarFDSCommand(idInexistente, "3M", null, null, null, null, null)))
				.isInstanceOf(FDSNaoEncontradaException.class)
				.hasMessageContaining(idInexistente);
	}

	@Test
	void devePublicarListaDeEventosApósGuardarMesmoQueVazia() {
		// atualizar campos (ao contrário de atualizarPara) nunca emite Domain
		// Events hoje — mas o use case chama sempre publicar(), mesmo com uma
		// lista vazia, para que uma futura alteração ao agregado que passe a
		// emitir eventos aqui não fique "esquecida" sem publicação (Fase 4,
		// Parte 4).
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto X", new Marca("3M"),
				null, null, null, null, null);
		// Drena o FDSCriadaEvent gerado pela própria criação do fixture,
		// simulando uma FDS já persistida antes deste caso de uso correr.
		fds.pullDomainEvents(Instant.now(RELOGIO_FIXO), null);
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(fds);
		EventPublisherPortFalso publicador = new EventPublisherPortFalso();
		AtualizarFDSUseCase useCase = new AtualizarFDSUseCase(repositorio, publicador, RELOGIO_FIXO, AUTENTICACAO_FALSA);

		useCase.executar(new AtualizarFDSCommand(fds.id().toString(), "A2Brios", null, null, null, null, null));

		assertThat(publicador.foiChamado).isTrue();
		assertThat(publicador.eventosPublicados).isEmpty();
	}

	@Test
	void deveLancarExcecaoQuandoFDSNaoEstaEmRascunho() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto Completo", new Marca("3M"),
				FornecedorId.gerar(), new Email("a@x.pt"),
				new DataValidade(LocalDate.of(2026, 1, 1), LocalDate.of(2027, 1, 1)),
				Set.of(PictogramaPerigo.CORROSIVOS), null);
		fds.atualizarPara(EstadoFDS.ATUALIZADA);
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(fds);
		AtualizarFDSUseCase useCase = new AtualizarFDSUseCase(repositorio, new EventPublisherPortFalso(), RELOGIO_FIXO,
				AUTENTICACAO_FALSA);

		assertThatThrownBy(() -> useCase.executar(
				new AtualizarFDSCommand(fds.id().toString(), "Outra Marca", null, null, null, null, null)))
				.isInstanceOf(FichaDadosSegurancaNaoEditavelException.class);
	}

	private static class FDSRepositoryPortFalso implements FDSRepositoryPort {
		private final Map<FDSId, FichaDadosSeguranca> porId = new HashMap<>();
		private boolean foiGuardada = false;

		FDSRepositoryPortFalso(FichaDadosSeguranca fds) {
			if (fds != null) {
				porId.put(fds.id(), fds);
			}
		}

		@Override
		public boolean existeDuplicado(String nomeProdutoQuimico, Marca marca, FornecedorId fornecedorId) {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}

		@Override
		public void guardar(FichaDadosSeguranca fds) {
			foiGuardada = true;
			porId.put(fds.id(), fds);
		}

		@Override
		public Optional<FichaDadosSeguranca> obterPorId(FDSId id) {
			return Optional.ofNullable(porId.get(id));
		}

		@Override
		public Pagina<FichaDadosSeguranca> listar(FiltroFDS filtro, int pagina, int tamanho) {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}

		@Override
		public java.util.List<FichaDadosSeguranca> listarCandidatasAObsolescencia() {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}
	}

	private static class EventPublisherPortFalso implements EventPublisherPort {
		private final List<DomainEvent> eventosPublicados = new ArrayList<>();
		private boolean foiChamado = false;

		@Override
		public void publicar(List<DomainEvent> eventos) {
			foiChamado = true;
			eventosPublicados.addAll(eventos);
		}
	}

	/**
	 * Fake do {@link AutenticacaoPort} (Fase 5, Parte 2) — evita depender do
	 * {@code SecurityContextHolder} do Spring Security nestes testes de
	 * Application, que não sobem nenhum contexto HTTP.
	 */
	private static class AutenticacaoPortFalso implements AutenticacaoPort {
		private final String utilizador;

		private AutenticacaoPortFalso(String utilizador) {
			this.utilizador = utilizador;
		}

		@Override
		public Optional<String> utilizadorAtual() {
			return Optional.ofNullable(utilizador);
		}
	}
}
