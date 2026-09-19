package com.dstgroup.fds.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.dstgroup.fds.application.dto.CriarFDSCommand;
import com.dstgroup.fds.application.dto.CriarFDSResponse;
import com.dstgroup.fds.application.port.out.AutenticacaoPort;
import com.dstgroup.fds.application.port.out.EventPublisherPort;
import com.dstgroup.fds.application.port.out.FDSRepositoryPort;
import com.dstgroup.fds.domain.fds.FDSCriadaEvent;
import com.dstgroup.fds.domain.fds.FichaDadosSeguranca;
import com.dstgroup.fds.domain.fds.FichaDadosSegurancaDuplicadaException;
import com.dstgroup.fds.domain.fds.Marca;
import com.dstgroup.fds.domain.fds.PictogramaPerigo;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;
import com.dstgroup.fds.domain.shared.DomainEvent;

/**
 * Testes do caso de uso, isolados de qualquer base de dados real — usam um
 * "fake" do {@link FDSRepositoryPort} em vez de Mockito (indisponível neste
 * ambiente por falta de acesso ao Maven Central). Com Mockito real, o mesmo
 * teste seria escrito com {@code mock(FDSRepositoryPort.class)} +
 * {@code when(...)}/{@code verify(...)} — a intenção é idêntica.
 */
class CriarFDSUseCaseTest {

	/** Fixo (Fase 5, Parte 2) — permite assertar o timestamp exato do evento, não só "perto de agora". */
	private static final Instant AGORA = Instant.parse("2026-06-01T10:00:00Z");
	private static final Clock RELOGIO_FIXO = Clock.fixed(AGORA, ZoneOffset.UTC);
	private static final AutenticacaoPort AUTENTICACAO_FALSA = new AutenticacaoPortFalso("gestor.dev");

	@Test
	void deveGuardarEDevolverIdAoCriarComSucesso() {
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso();
		CriarFDSUseCase useCase = new CriarFDSUseCase(repositorio, new EventPublisherPortFalso(), RELOGIO_FIXO,
				AUTENTICACAO_FALSA);
		CriarFDSCommand comando = new CriarFDSCommand(
				"SprayMount Adhesive", "3M", FornecedorId.gerar().valor().toString(), "fornecedor@3m.com",
				LocalDate.of(2026, 1, 1), LocalDate.of(2027, 1, 1), Set.of(PictogramaPerigo.CORROSIVOS), Set.of()
		);

		CriarFDSResponse resposta = useCase.executar(comando);

		assertThat(resposta.id()).isNotBlank();
		assertThat(repositorio.fdsGuardada).isNotNull();
		assertThat(repositorio.fdsGuardada.nomeProdutoQuimico()).isEqualTo("SprayMount Adhesive");
		assertThat(repositorio.fdsGuardada.id().toString()).isEqualTo(resposta.id());
	}

	@Test
	void deveRejeitarCriacaoSeJaExisteFDSComMesmoNomeMarcaFornecedor() {
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso();
		repositorio.proximaRespostaExisteDuplicado = true;
		CriarFDSUseCase useCase = new CriarFDSUseCase(repositorio, new EventPublisherPortFalso(), RELOGIO_FIXO,
				AUTENTICACAO_FALSA);
		CriarFDSCommand comando = new CriarFDSCommand(
				"SprayMount Adhesive", "3M", FornecedorId.gerar().valor().toString(), "fornecedor@3m.com",
				LocalDate.of(2026, 1, 1), LocalDate.of(2027, 1, 1), Set.of(PictogramaPerigo.CORROSIVOS), Set.of()
		);

		assertThatThrownBy(() -> useCase.executar(comando))
				.isInstanceOf(FichaDadosSegurancaDuplicadaException.class);

		assertThat(repositorio.fdsGuardada).isNull(); // nunca deve chegar a guardar
	}

	@Test
	void naoDeveVerificarDuplicadoQuandoAindaNaoHaFornecedor() {
		// um rascunho sem fornecedor não pode ser comparado por unicidade —
		// a verificação só faz sentido quando há um fornecedor concreto
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso();
		repositorio.proximaRespostaExisteDuplicado = true; // mesmo que "mentisse" que sim...
		CriarFDSUseCase useCase = new CriarFDSUseCase(repositorio, new EventPublisherPortFalso(), RELOGIO_FIXO,
				AUTENTICACAO_FALSA);
		CriarFDSCommand comando = new CriarFDSCommand(
				"Produto Sem Fornecedor", "MarcaX", null, null, null, null, null, null
		);

		CriarFDSResponse resposta = useCase.executar(comando); // ...não deve rejeitar

		assertThat(resposta.id()).isNotBlank();
		assertThat(repositorio.existeDuplicadoFoiChamado).isFalse();
	}

	@Test
	void devePublicarFDSCriadaEventApósGuardarComSucesso() {
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso();
		EventPublisherPortFalso publicador = new EventPublisherPortFalso();
		CriarFDSUseCase useCase = new CriarFDSUseCase(repositorio, publicador, RELOGIO_FIXO, AUTENTICACAO_FALSA);
		CriarFDSCommand comando = new CriarFDSCommand(
				"SprayMount Adhesive", "3M", FornecedorId.gerar().valor().toString(), "fornecedor@3m.com",
				LocalDate.of(2026, 1, 1), LocalDate.of(2027, 1, 1), Set.of(PictogramaPerigo.CORROSIVOS), Set.of()
		);

		CriarFDSResponse resposta = useCase.executar(comando);

		assertThat(publicador.eventosPublicados).hasSize(1);
		assertThat(publicador.eventosPublicados.get(0)).isInstanceOf(FDSCriadaEvent.class);
		FDSCriadaEvent evento = (FDSCriadaEvent) publicador.eventosPublicados.get(0);
		assertThat(evento.fdsId().toString()).isEqualTo(resposta.id());
		// timestamp exato do Clock injetado (Fase 5, Parte 2) — não apenas "próximo de agora"
		assertThat(evento.ocorridoEm()).isEqualTo(AGORA);
	}

	@Test
	void naoDevePublicarNenhumEventoSeCriacaoForRejeitadaPorDuplicado() {
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso();
		repositorio.proximaRespostaExisteDuplicado = true;
		EventPublisherPortFalso publicador = new EventPublisherPortFalso();
		CriarFDSUseCase useCase = new CriarFDSUseCase(repositorio, publicador, RELOGIO_FIXO, AUTENTICACAO_FALSA);
		CriarFDSCommand comando = new CriarFDSCommand(
				"SprayMount Adhesive", "3M", FornecedorId.gerar().valor().toString(), "fornecedor@3m.com",
				LocalDate.of(2026, 1, 1), LocalDate.of(2027, 1, 1), Set.of(PictogramaPerigo.CORROSIVOS), Set.of()
		);

		try {
			useCase.executar(comando);
		} catch (FichaDadosSegurancaDuplicadaException esperado) {
			// ignorado — o que interessa é o efeito colateral
		}

		assertThat(publicador.eventosPublicados).isEmpty();
	}

	private static class FDSRepositoryPortFalso implements FDSRepositoryPort {
		private boolean proximaRespostaExisteDuplicado = false;
		private boolean existeDuplicadoFoiChamado = false;
		private FichaDadosSeguranca fdsGuardada;

		@Override
		public boolean existeDuplicado(String nomeProdutoQuimico, Marca marca, FornecedorId fornecedorId) {
			existeDuplicadoFoiChamado = true;
			return proximaRespostaExisteDuplicado;
		}

		@Override
		public void guardar(FichaDadosSeguranca fds) {
			this.fdsGuardada = fds;
		}

		@Override
		public java.util.Optional<FichaDadosSeguranca> obterPorId(com.dstgroup.fds.domain.fds.FDSId id) {
			throw new UnsupportedOperationException("Não usado nestes testes (ver Parte 9).");
		}

		@Override
		public com.dstgroup.fds.application.dto.Pagina<FichaDadosSeguranca> listar(
				com.dstgroup.fds.application.dto.FiltroFDS filtro, int pagina, int tamanho) {
			throw new UnsupportedOperationException("Não usado nestes testes (ver Parte 9).");
		}

		@Override
		public java.util.List<FichaDadosSeguranca> listarCandidatasAObsolescencia() {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}
	}

	private static class EventPublisherPortFalso implements EventPublisherPort {
		private final List<DomainEvent> eventosPublicados = new ArrayList<>();

		@Override
		public void publicar(List<DomainEvent> eventos) {
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
