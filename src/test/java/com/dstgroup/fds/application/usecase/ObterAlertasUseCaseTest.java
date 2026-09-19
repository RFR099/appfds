package com.dstgroup.fds.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.dstgroup.fds.application.dto.AlertasResponse;
import com.dstgroup.fds.application.dto.FiltroFDS;
import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.port.out.FDSRepositoryPort;
import com.dstgroup.fds.application.port.out.TicketFDSRepositoryPort;
import com.dstgroup.fds.domain.fds.DataValidade;
import com.dstgroup.fds.domain.fds.EstadoFDS;
import com.dstgroup.fds.domain.fds.FDSId;
import com.dstgroup.fds.domain.fds.FichaDadosSeguranca;
import com.dstgroup.fds.domain.fds.Marca;
import com.dstgroup.fds.domain.fds.PictogramaPerigo;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;
import com.dstgroup.fds.domain.shared.Email;
import com.dstgroup.fds.domain.ticket.TicketFDS;
import com.dstgroup.fds.domain.ticket.TicketFDSId;

class ObterAlertasUseCaseTest {

	private static final LocalDate REVISAO = LocalDate.of(2026, 1, 1);
	private static final LocalDate VALIDADE = LocalDate.of(2027, 1, 1);
	private static final int DIAS_ANTECEDENCIA_FDS = 30;
	private static final int DIAS_SEM_RESPOSTA_TICKET = 5;

	/** "Hoje" congelado dentro da janela de pré-aviso (10 dias antes da validade). */
	private static final Clock RELOGIO_DENTRO_DA_JANELA =
			Clock.fixed(VALIDADE.minusDays(10).atStartOfDay(ZoneOffset.UTC).toInstant(), ZoneOffset.UTC);

	/** "Hoje" congelado bem antes de qualquer janela de alerta. */
	private static final Clock RELOGIO_LONGE_DE_QUALQUER_ALERTA =
			Clock.fixed(VALIDADE.minusYears(1).atStartOfDay(ZoneOffset.UTC).toInstant(), ZoneOffset.UTC);

	@Test
	void deveIncluirFDSDentroDaJanelaDePreAviso() {
		FichaDadosSeguranca fds = fdsAtualizadaComValidade();
		FDSRepositorioFalso fdsRepo = new FDSRepositorioFalso(List.of(fds));
		TicketRepositorioFalso ticketRepo = new TicketRepositorioFalso(List.of());
		ObterAlertasUseCase useCase = new ObterAlertasUseCase(fdsRepo, ticketRepo, RELOGIO_DENTRO_DA_JANELA,
				DIAS_ANTECEDENCIA_FDS, DIAS_SEM_RESPOSTA_TICKET);

		AlertasResponse resposta = useCase.executar();

		assertThat(resposta.total()).isEqualTo(1);
		assertThat(resposta.fdsAExpirar()).hasSize(1);
		assertThat(resposta.fdsAExpirar().get(0).fdsId()).isEqualTo(fds.id().toString());
		assertThat(resposta.ticketsSemResposta()).isEmpty();
	}

	@Test
	void naoDeveIncluirFDSForaDaJanela() {
		FichaDadosSeguranca fds = fdsAtualizadaComValidade();
		FDSRepositorioFalso fdsRepo = new FDSRepositorioFalso(List.of(fds));
		TicketRepositorioFalso ticketRepo = new TicketRepositorioFalso(List.of());
		ObterAlertasUseCase useCase = new ObterAlertasUseCase(fdsRepo, ticketRepo, RELOGIO_LONGE_DE_QUALQUER_ALERTA,
				DIAS_ANTECEDENCIA_FDS, DIAS_SEM_RESPOSTA_TICKET);

		AlertasResponse resposta = useCase.executar();

		assertThat(resposta.total()).isZero();
		assertThat(resposta.fdsAExpirar()).isEmpty();
	}

	@Test
	void deveIncluirTicketAbertoHaMaisDeXDiasSemResposta() {
		Instant abertura = RELOGIO_LONGE_DE_QUALQUER_ALERTA.instant().minusSeconds(60L * 60 * 24 * 10);
		TicketFDS ticket = TicketFDS.abrir(null, FornecedorId.gerar(), abertura);
		FDSRepositorioFalso fdsRepo = new FDSRepositorioFalso(List.of());
		TicketRepositorioFalso ticketRepo = new TicketRepositorioFalso(List.of(ticket));
		ObterAlertasUseCase useCase = new ObterAlertasUseCase(fdsRepo, ticketRepo, RELOGIO_LONGE_DE_QUALQUER_ALERTA,
				DIAS_ANTECEDENCIA_FDS, DIAS_SEM_RESPOSTA_TICKET);

		AlertasResponse resposta = useCase.executar();

		assertThat(resposta.total()).isEqualTo(1);
		assertThat(resposta.ticketsSemResposta()).hasSize(1);
		assertThat(resposta.ticketsSemResposta().get(0).ticketId()).isEqualTo(ticket.id().toString());
		assertThat(resposta.fdsAExpirar()).isEmpty();
	}

	@Test
	void deveSomarFDSETicketsNoTotal() {
		FichaDadosSeguranca fds = fdsAtualizadaComValidade();
		Instant abertura = RELOGIO_DENTRO_DA_JANELA.instant().minusSeconds(60L * 60 * 24 * 10);
		TicketFDS ticket = TicketFDS.abrir(null, FornecedorId.gerar(), abertura);
		FDSRepositorioFalso fdsRepo = new FDSRepositorioFalso(List.of(fds));
		TicketRepositorioFalso ticketRepo = new TicketRepositorioFalso(List.of(ticket));
		ObterAlertasUseCase useCase = new ObterAlertasUseCase(fdsRepo, ticketRepo, RELOGIO_DENTRO_DA_JANELA,
				DIAS_ANTECEDENCIA_FDS, DIAS_SEM_RESPOSTA_TICKET);

		AlertasResponse resposta = useCase.executar();

		assertThat(resposta.total()).isEqualTo(2);
	}

	private static FichaDadosSeguranca fdsAtualizadaComValidade() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto A", new Marca("3M"),
				FornecedorId.gerar(), new Email("a@x.pt"), new DataValidade(REVISAO, VALIDADE),
				Set.of(PictogramaPerigo.CORROSIVOS), null);
		fds.atualizarPara(EstadoFDS.ATUALIZADA);
		return fds;
	}

	private static class FDSRepositorioFalso implements FDSRepositoryPort {
		private final List<FichaDadosSeguranca> candidatas;

		FDSRepositorioFalso(List<FichaDadosSeguranca> candidatas) {
			this.candidatas = candidatas;
		}

		@Override
		public boolean existeDuplicado(String nomeProdutoQuimico, Marca marca, FornecedorId fornecedorId) {
			throw new UnsupportedOperationException();
		}

		@Override
		public void guardar(FichaDadosSeguranca fds) {
			throw new UnsupportedOperationException();
		}

		@Override
		public Optional<FichaDadosSeguranca> obterPorId(FDSId id) {
			throw new UnsupportedOperationException();
		}

		@Override
		public Pagina<FichaDadosSeguranca> listar(FiltroFDS filtro, int pagina, int tamanho) {
			throw new UnsupportedOperationException();
		}

		@Override
		public List<FichaDadosSeguranca> listarCandidatasAObsolescencia() {
			return candidatas;
		}
	}

	private static class TicketRepositorioFalso implements TicketFDSRepositoryPort {
		private final List<TicketFDS> abertos;

		TicketRepositorioFalso(List<TicketFDS> abertos) {
			this.abertos = abertos;
		}

		@Override
		public void guardar(TicketFDS ticket) {
			throw new UnsupportedOperationException();
		}

		@Override
		public Optional<TicketFDS> obterPorId(TicketFDSId id) {
			throw new UnsupportedOperationException();
		}

		@Override
		public Pagina<TicketFDS> listar(int pagina, int tamanho) {
			throw new UnsupportedOperationException();
		}

		@Override
		public List<TicketFDS> listarAbertos() {
			return abertos;
		}
	}
}
