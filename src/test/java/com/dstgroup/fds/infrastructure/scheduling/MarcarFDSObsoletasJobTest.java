package com.dstgroup.fds.infrastructure.scheduling;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.dstgroup.fds.application.dto.FiltroFDS;
import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.port.out.EventPublisherPort;
import com.dstgroup.fds.application.port.out.FDSRepositoryPort;
import com.dstgroup.fds.application.usecase.MarcarFDSObsoletasUseCase;
import com.dstgroup.fds.domain.fds.DataValidade;
import com.dstgroup.fds.domain.fds.EstadoFDS;
import com.dstgroup.fds.domain.fds.FDSId;
import com.dstgroup.fds.domain.fds.FichaDadosSeguranca;
import com.dstgroup.fds.domain.fds.Marca;
import com.dstgroup.fds.domain.fds.PictogramaPerigo;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;
import com.dstgroup.fds.domain.shared.DomainEvent;
import com.dstgroup.fds.domain.shared.Email;

/**
 * <p><b>Nota de honestidade</b>: não testa o agendamento {@code @Scheduled}
 * em si (precisaria de um contexto Spring real) — confirma apenas que o job
 * delega corretamente para {@link MarcarFDSObsoletasUseCase} quando
 * invocado, usando o caso de uso real (já testado isoladamente em
 * {@code MarcarFDSObsoletasUseCaseTest}) com um fake do repositório.</p>
 */
class MarcarFDSObsoletasJobTest {

	@Test
	void deveDelegarParaOCasoDeUsoEMarcarAsElegiveis() {
		LocalDate revisao = LocalDate.of(2026, 1, 1);
		LocalDate validade = LocalDate.of(2027, 1, 1);
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto X", new Marca("3M"),
				FornecedorId.gerar(), new Email("a@x.pt"),
				new DataValidade(revisao, validade), Set.of(PictogramaPerigo.CORROSIVOS), null);
		fds.atualizarPara(EstadoFDS.ATUALIZADA);

		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(List.of(fds));
		Clock relogioAposExpiracao = Clock.fixed(
				validade.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant(), ZoneOffset.UTC);
		MarcarFDSObsoletasUseCase useCase = new MarcarFDSObsoletasUseCase(repositorio, new EventPublisherPortFalso(),
				relogioAposExpiracao, Optional::empty);
		MarcarFDSObsoletasJob job = new MarcarFDSObsoletasJob(useCase);

		job.executar();

		assertThat(fds.estado()).isEqualTo(EstadoFDS.OBSOLETA);
		assertThat(repositorio.guardadas).containsExactly(fds);
	}

	@Test
	void naoDeveLancarExcecaoQuandoNaoHaCandidatas() {
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(List.of());
		MarcarFDSObsoletasUseCase useCase = new MarcarFDSObsoletasUseCase(repositorio, new EventPublisherPortFalso(),
				Clock.systemDefaultZone(), Optional::empty);
		MarcarFDSObsoletasJob job = new MarcarFDSObsoletasJob(useCase);

		job.executar(); // não deve lançar nada
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
		@Override
		public void publicar(List<DomainEvent> eventos) {
			// não usado nas asserções deste teste — só precisa de não lançar.
		}
	}
}
