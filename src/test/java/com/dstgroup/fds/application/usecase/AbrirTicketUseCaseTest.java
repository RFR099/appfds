package com.dstgroup.fds.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.dstgroup.fds.application.dto.AbrirTicketCommand;
import com.dstgroup.fds.application.dto.AbrirTicketResponse;
import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.port.out.FornecedorRepositoryPort;
import com.dstgroup.fds.application.port.out.MetricasPort;
import com.dstgroup.fds.application.port.out.NotificadorPort;
import com.dstgroup.fds.application.port.out.TicketFDSRepositoryPort;
import com.dstgroup.fds.domain.fds.FDSId;
import com.dstgroup.fds.domain.fornecedor.Fornecedor;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;
import com.dstgroup.fds.domain.fornecedor.FornecedorNaoEncontradoException;
import com.dstgroup.fds.domain.fornecedor.NomeFornecedor;
import com.dstgroup.fds.domain.shared.Email;
import com.dstgroup.fds.domain.ticket.TicketFDS;
import com.dstgroup.fds.domain.ticket.TicketFDSId;

class AbrirTicketUseCaseTest {

	private static final Clock RELOGIO_FIXO =
			Clock.fixed(Instant.parse("2026-06-01T10:00:00Z"), ZoneOffset.UTC);

	// Instância nova por teste (JUnit5 cria uma instância de teste por método,
	// por omissão) — nunca "static", para que o contador de cada fake não
	// contamine as asserções de outro método de teste.
	private final MetricasPortFalso metricasFalsa = new MetricasPortFalso();

	@Test
	void deveAbrirTicketEGuardar() {
		Fornecedor fornecedor = Fornecedor.criar(new NomeFornecedor("3M"), new Email("contacto@3m.com"), null);
		TicketRepositorioFalso repositorio = new TicketRepositorioFalso();
		FornecedorRepositorioFalso fornecedorRepositorio = new FornecedorRepositorioFalso(fornecedor);
		NotificadorFalso notificador = new NotificadorFalso();
		AbrirTicketUseCase useCase = new AbrirTicketUseCase(repositorio, fornecedorRepositorio, notificador,
				RELOGIO_FIXO, metricasFalsa);

		AbrirTicketResponse resposta = useCase.executar(
				new AbrirTicketCommand(null, fornecedor.id().toString(), null, null));

		assertThat(resposta.id()).isNotBlank();
		assertThat(repositorio.guardado).isNotNull();
		assertThat(repositorio.guardado.fornecedorId()).isEqualTo(fornecedor.id());
		assertThat(repositorio.guardado.dataAbertura()).isEqualTo(Instant.now(RELOGIO_FIXO));
		assertThat(metricasFalsa.ticketsAbertos).isEqualTo(1);
	}

	@Test
	void deveIncrementarMetricaDeTicketsAbertosUmaVezPorTicketAberto() {
		Fornecedor fornecedor = Fornecedor.criar(new NomeFornecedor("3M"), new Email("contacto@3m.com"), null);
		AbrirTicketUseCase useCase = new AbrirTicketUseCase(new TicketRepositorioFalso(),
				new FornecedorRepositorioFalso(fornecedor), new NotificadorFalso(), RELOGIO_FIXO, metricasFalsa);

		useCase.executar(new AbrirTicketCommand(null, fornecedor.id().toString(), null, null));
		useCase.executar(new AbrirTicketCommand(null, fornecedor.id().toString(), null, null));
		useCase.executar(new AbrirTicketCommand(null, fornecedor.id().toString(), null, null));

		assertThat(metricasFalsa.ticketsAbertos).isEqualTo(3);
	}

	@Test
	void deveAbrirTicketParaFDSExistente() {
		Fornecedor fornecedor = Fornecedor.criar(new NomeFornecedor("3M"), new Email("contacto@3m.com"), null);
		TicketRepositorioFalso repositorio = new TicketRepositorioFalso();
		AbrirTicketUseCase useCase = new AbrirTicketUseCase(repositorio, new FornecedorRepositorioFalso(fornecedor),
				new NotificadorFalso(), RELOGIO_FIXO, metricasFalsa);
		FDSId fdsId = FDSId.gerar();

		useCase.executar(new AbrirTicketCommand(fdsId.toString(), fornecedor.id().toString(), null, null));

		assertThat(repositorio.guardado.fdsId()).isEqualTo(fdsId);
	}

	@Test
	void deveAdicionarMensagemInicialQuandoFornecida() {
		Fornecedor fornecedor = Fornecedor.criar(new NomeFornecedor("3M"), new Email("contacto@3m.com"), null);
		TicketRepositorioFalso repositorio = new TicketRepositorioFalso();
		AbrirTicketUseCase useCase = new AbrirTicketUseCase(repositorio, new FornecedorRepositorioFalso(fornecedor),
				new NotificadorFalso(), RELOGIO_FIXO, metricasFalsa);

		useCase.executar(new AbrirTicketCommand(null, fornecedor.id().toString(),
				"Por favor enviem a FDS mais recente.", "gestor@dstgroup.pt"));

		assertThat(repositorio.guardado.mensagens()).hasSize(1);
		assertThat(repositorio.guardado.mensagens().get(0).autor()).isEqualTo("gestor@dstgroup.pt");
	}

	@Test
	void deveNotificarOFornecedorComOEmailPrincipal() {
		Fornecedor fornecedor = Fornecedor.criar(new NomeFornecedor("3M"), new Email("contacto@3m.com"), null);
		NotificadorFalso notificador = new NotificadorFalso();
		AbrirTicketUseCase useCase = new AbrirTicketUseCase(new TicketRepositorioFalso(),
				new FornecedorRepositorioFalso(fornecedor), notificador, RELOGIO_FIXO, metricasFalsa);

		useCase.executar(new AbrirTicketCommand(null, fornecedor.id().toString(), null, null));

		assertThat(notificador.destinatarioRecebido).isEqualTo("contacto@3m.com");
		assertThat(notificador.corpoRecebido).isNotBlank();
	}

	@Test
	void deveUsarMensagemInicialComoCorpoDaNotificacaoQuandoFornecida() {
		Fornecedor fornecedor = Fornecedor.criar(new NomeFornecedor("3M"), new Email("contacto@3m.com"), null);
		NotificadorFalso notificador = new NotificadorFalso();
		AbrirTicketUseCase useCase = new AbrirTicketUseCase(new TicketRepositorioFalso(),
				new FornecedorRepositorioFalso(fornecedor), notificador, RELOGIO_FIXO, metricasFalsa);

		useCase.executar(new AbrirTicketCommand(null, fornecedor.id().toString(), "Mensagem personalizada.",
				"gestor@dstgroup.pt"));

		assertThat(notificador.corpoRecebido).isEqualTo("Mensagem personalizada.");
	}

	@Test
	void deveLancarExcecaoSeFornecedorNaoExiste() {
		AbrirTicketUseCase useCase = new AbrirTicketUseCase(new TicketRepositorioFalso(),
				new FornecedorRepositorioFalso(null), new NotificadorFalso(), RELOGIO_FIXO, metricasFalsa);
		String idInexistente = UUID.randomUUID().toString();

		assertThatThrownBy(() -> useCase.executar(new AbrirTicketCommand(null, idInexistente, null, null)))
				.isInstanceOf(FornecedorNaoEncontradoException.class);
	}

	@Test
	void naoDeveGuardarNemNotificarSeFornecedorNaoExiste() {
		TicketRepositorioFalso repositorio = new TicketRepositorioFalso();
		NotificadorFalso notificador = new NotificadorFalso();
		AbrirTicketUseCase useCase = new AbrirTicketUseCase(repositorio, new FornecedorRepositorioFalso(null),
				notificador, RELOGIO_FIXO, metricasFalsa);

		try {
			useCase.executar(new AbrirTicketCommand(null, UUID.randomUUID().toString(), null, null));
		} catch (FornecedorNaoEncontradoException esperado) {
			// ignorado — o que interessa é o efeito colateral
		}

		assertThat(repositorio.guardado).isNull();
		assertThat(notificador.foiChamado).isFalse();
		assertThat(metricasFalsa.ticketsAbertos).isZero();
	}

	private static class TicketRepositorioFalso implements TicketFDSRepositoryPort {
		private final Map<TicketFDSId, TicketFDS> porId = new HashMap<>();
		private TicketFDS guardado;

		@Override
		public void guardar(TicketFDS ticket) {
			this.guardado = ticket;
			porId.put(ticket.id(), ticket);
		}

		@Override
		public Optional<TicketFDS> obterPorId(TicketFDSId id) {
			return Optional.ofNullable(porId.get(id));
		}

		@Override
		public Pagina<TicketFDS> listar(int pagina, int tamanho) {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}

		@Override
		public java.util.List<TicketFDS> listarAbertos() {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}
	}

	private static class FornecedorRepositorioFalso implements FornecedorRepositoryPort {
		private final Fornecedor fornecedor;

		FornecedorRepositorioFalso(Fornecedor fornecedor) {
			this.fornecedor = fornecedor;
		}

		@Override
		public void guardar(Fornecedor fornecedor) {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}

		@Override
		public Optional<Fornecedor> obterPorId(FornecedorId id) {
			return fornecedor != null && fornecedor.id().equals(id) ? Optional.of(fornecedor) : Optional.empty();
		}

		@Override
		public Pagina<Fornecedor> listar(int pagina, int tamanho) {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}
	}

	private static class NotificadorFalso implements NotificadorPort {
		private boolean foiChamado = false;
		private String destinatarioRecebido;
		private String corpoRecebido;

		@Override
		public void enviar(String destinatario, String assunto, String corpo) {
			this.foiChamado = true;
			this.destinatarioRecebido = destinatario;
			this.corpoRecebido = corpo;
		}
	}

	private static class MetricasPortFalso implements MetricasPort {
		private int ticketsAbertos = 0;

		@Override
		public void incrementarFDSCriadas() {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}

		@Override
		public void incrementarFDSMarcadasObsoletas() {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}

		@Override
		public void incrementarTicketsAbertos() {
			ticketsAbertos++;
		}
	}
}
