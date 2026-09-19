package com.dstgroup.fds.infrastructure.config;

import java.time.Clock;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.dstgroup.fds.application.port.out.AuditoriaRepositoryPort;
import com.dstgroup.fds.application.port.out.AutenticacaoPort;
import com.dstgroup.fds.application.port.out.CentroProdutivoRepositoryPort;
import com.dstgroup.fds.application.port.out.EventPublisherPort;
import com.dstgroup.fds.application.port.out.FDSRepositoryPort;
import com.dstgroup.fds.application.port.out.FornecedorRepositoryPort;
import com.dstgroup.fds.application.port.out.ImagemStoragePort;
import com.dstgroup.fds.application.port.out.MetricasPort;
import com.dstgroup.fds.application.port.out.NotificadorPort;
import com.dstgroup.fds.application.port.out.ObraRepositoryPort;
import com.dstgroup.fds.application.port.out.TicketFDSRepositoryPort;
import com.dstgroup.fds.application.usecase.AbrirTicketUseCase;
import com.dstgroup.fds.application.usecase.AdicionarImagemFDSUseCase;
import com.dstgroup.fds.application.usecase.AtualizarFDSUseCase;
import com.dstgroup.fds.application.usecase.CriarCentroProdutivoUseCase;
import com.dstgroup.fds.application.usecase.CriarFDSUseCase;
import com.dstgroup.fds.application.usecase.CriarFornecedorUseCase;
import com.dstgroup.fds.application.usecase.CriarObraUseCase;
import com.dstgroup.fds.application.usecase.ListarCentrosProdutivosUseCase;
import com.dstgroup.fds.application.usecase.ListarFDSUseCase;
import com.dstgroup.fds.application.usecase.ListarFornecedoresUseCase;
import com.dstgroup.fds.application.usecase.ListarObrasUseCase;
import com.dstgroup.fds.application.usecase.MarcarFDSObsoletasUseCase;
import com.dstgroup.fds.application.usecase.ObterCentroProdutivoUseCase;
import com.dstgroup.fds.application.usecase.ObterFDSUseCase;
import com.dstgroup.fds.application.usecase.ObterFornecedorUseCase;
import com.dstgroup.fds.application.usecase.ObterAlertasUseCase;
import com.dstgroup.fds.application.usecase.ObterHistoricoAuditoriaUseCase;
import com.dstgroup.fds.application.usecase.ObterObraUseCase;
import com.dstgroup.fds.application.usecase.ObterTicketUseCase;
import com.dstgroup.fds.application.usecase.RegistarAuditoriaUseCase;

/**
 * Regista os casos de uso como beans Spring. Os casos de uso em si (package
 * {@code application.usecase}) não têm nenhuma anotação Spring — toda a
 * "cablagem" com o framework vive aqui, na Infrastructure, mantendo a
 * Application testável e reutilizável fora deste framework se necessário.
 */
@Configuration
public class UseCaseConfig {

	@Bean
	public CriarFDSUseCase criarFDSUseCase(FDSRepositoryPort repositorio, EventPublisherPort eventPublisher,
			Clock relogio, AutenticacaoPort autenticacao) {
		return new CriarFDSUseCase(repositorio, eventPublisher, relogio, autenticacao);
	}

	@Bean
	public ObterFDSUseCase obterFDSUseCase(FDSRepositoryPort repositorio) {
		return new ObterFDSUseCase(repositorio);
	}

	@Bean
	public ListarFDSUseCase listarFDSUseCase(FDSRepositoryPort repositorio) {
		return new ListarFDSUseCase(repositorio);
	}

	@Bean
	public AtualizarFDSUseCase atualizarFDSUseCase(FDSRepositoryPort repositorio, EventPublisherPort eventPublisher,
			Clock relogio, AutenticacaoPort autenticacao) {
		return new AtualizarFDSUseCase(repositorio, eventPublisher, relogio, autenticacao);
	}

	@Bean
	public AdicionarImagemFDSUseCase adicionarImagemFDSUseCase(FDSRepositoryPort repositorio,
			ImagemStoragePort storage, EventPublisherPort eventPublisher, Clock relogio,
			AutenticacaoPort autenticacao) {
		return new AdicionarImagemFDSUseCase(repositorio, storage, eventPublisher, relogio, autenticacao);
	}

	@Bean
	public CriarFornecedorUseCase criarFornecedorUseCase(FornecedorRepositoryPort repositorio) {
		return new CriarFornecedorUseCase(repositorio);
	}

	@Bean
	public ObterFornecedorUseCase obterFornecedorUseCase(FornecedorRepositoryPort repositorio) {
		return new ObterFornecedorUseCase(repositorio);
	}

	@Bean
	public ListarFornecedoresUseCase listarFornecedoresUseCase(FornecedorRepositoryPort repositorio) {
		return new ListarFornecedoresUseCase(repositorio);
	}

	@Bean
	public CriarCentroProdutivoUseCase criarCentroProdutivoUseCase(CentroProdutivoRepositoryPort repositorio) {
		return new CriarCentroProdutivoUseCase(repositorio);
	}

	@Bean
	public ObterCentroProdutivoUseCase obterCentroProdutivoUseCase(CentroProdutivoRepositoryPort repositorio) {
		return new ObterCentroProdutivoUseCase(repositorio);
	}

	@Bean
	public ListarCentrosProdutivosUseCase listarCentrosProdutivosUseCase(CentroProdutivoRepositoryPort repositorio) {
		return new ListarCentrosProdutivosUseCase(repositorio);
	}

	@Bean
	public CriarObraUseCase criarObraUseCase(ObraRepositoryPort repositorio) {
		return new CriarObraUseCase(repositorio);
	}

	@Bean
	public ObterObraUseCase obterObraUseCase(ObraRepositoryPort repositorio) {
		return new ObterObraUseCase(repositorio);
	}

	@Bean
	public ListarObrasUseCase listarObrasUseCase(ObraRepositoryPort repositorio) {
		return new ListarObrasUseCase(repositorio);
	}

	@Bean
	public MarcarFDSObsoletasUseCase marcarFDSObsoletasUseCase(FDSRepositoryPort repositorio,
			EventPublisherPort eventPublisher, Clock relogio, AutenticacaoPort autenticacao) {
		return new MarcarFDSObsoletasUseCase(repositorio, eventPublisher, relogio, autenticacao);
	}

	@Bean
	public AbrirTicketUseCase abrirTicketUseCase(TicketFDSRepositoryPort repositorio,
			FornecedorRepositoryPort fornecedorRepositorio, NotificadorPort notificador, Clock relogio,
			MetricasPort metricas) {
		return new AbrirTicketUseCase(repositorio, fornecedorRepositorio, notificador, relogio, metricas);
	}

	@Bean
	public ObterTicketUseCase obterTicketUseCase(TicketFDSRepositoryPort repositorio) {
		return new ObterTicketUseCase(repositorio);
	}

	@Bean
	public RegistarAuditoriaUseCase registarAuditoriaUseCase(AuditoriaRepositoryPort repositorio) {
		return new RegistarAuditoriaUseCase(repositorio);
	}

	@Bean
	public ObterHistoricoAuditoriaUseCase obterHistoricoAuditoriaUseCase(FDSRepositoryPort fdsRepositorio,
			AuditoriaRepositoryPort auditoriaRepositorio) {
		return new ObterHistoricoAuditoriaUseCase(fdsRepositorio, auditoriaRepositorio);
	}

	@Bean
	public ObterAlertasUseCase obterAlertasUseCase(FDSRepositoryPort fdsRepositorio,
			TicketFDSRepositoryPort ticketRepositorio, Clock relogio,
			@Value("${app.alertas.fds-dias-antecedencia:30}") int diasAntecedenciaFDS,
			@Value("${app.alertas.ticket-dias-sem-resposta:5}") int diasSemRespostaTicket) {
		return new ObterAlertasUseCase(fdsRepositorio, ticketRepositorio, relogio, diasAntecedenciaFDS,
				diasSemRespostaTicket);
	}
}
