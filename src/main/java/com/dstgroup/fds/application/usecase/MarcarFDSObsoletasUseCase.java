package com.dstgroup.fds.application.usecase;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import com.dstgroup.fds.application.port.out.AutenticacaoPort;
import com.dstgroup.fds.application.port.out.EventPublisherPort;
import com.dstgroup.fds.application.port.out.FDSRepositoryPort;
import com.dstgroup.fds.domain.fds.EstadoFDS;
import com.dstgroup.fds.domain.fds.FichaDadosSeguranca;
import com.dstgroup.fds.domain.fds.PoliticaValidadeFDS;

/**
 * Caso de uso: percorre todas as FDS candidatas a obsolescência e marca como
 * {@code OBSOLETA} as que a {@link PoliticaValidadeFDS} determinar. Invocado
 * periodicamente pelo job agendado (Fase 3, Parte 8).
 *
 * <p>Recebe um {@link Clock} injetado — nunca {@code Clock.systemDefaultZone()}
 * chamado internamente — para que os testes possam "congelar" a data sem
 * esperas reais, e para que em produção o job possa injetar o relógio real
 * uma única vez, centralizado na configuração.</p>
 *
 * <p>Publica o {@code FDSEstadoAlteradoEvent} de cada FDS marcada (Fase 4,
 * Parte 4) logo a seguir a persistir essa FDS — nunca em lote no final, para
 * que um erro a meio do processamento não deixe eventos por publicar de FDS
 * já persistidas com sucesso.</p>
 *
 * <p>O {@code utilizador} de cada evento (RF12/RNF03, Fase 5 Parte 2) é
 * sempre {@code null} aqui — este caso de uso corre num job agendado, sem
 * nenhum utilizador humano por trás da decisão; é o próprio sistema a
 * marcar a FDS como obsoleta. {@link AutenticacaoPort#utilizadorAtual()}
 * devolve naturalmente vazio nesta thread (sem {@code SecurityContext}), o
 * que já reflete isso corretamente sem nenhum caso especial aqui.</p>
 */
public class MarcarFDSObsoletasUseCase {

	private final FDSRepositoryPort repositorio;
	private final EventPublisherPort eventPublisher;
	private final Clock relogio;
	private final AutenticacaoPort autenticacao;

	public MarcarFDSObsoletasUseCase(FDSRepositoryPort repositorio, EventPublisherPort eventPublisher, Clock relogio,
			AutenticacaoPort autenticacao) {
		this.repositorio = repositorio;
		this.eventPublisher = eventPublisher;
		this.relogio = relogio;
		this.autenticacao = autenticacao;
	}

	/**
	 * @return quantas FDS foram marcadas como Obsoletas nesta execução —
	 * útil para o job agendado registar num log/métrica.
	 */
	public int executar() {
		LocalDate hoje = LocalDate.now(relogio);
		Instant agora = Instant.now(relogio);
		List<FichaDadosSeguranca> candidatas = repositorio.listarCandidatasAObsolescencia();

		int marcadas = 0;
		for (FichaDadosSeguranca fds : candidatas) {
			if (PoliticaValidadeFDS.deveMarcarComoObsoleta(fds, hoje)) {
				fds.atualizarPara(EstadoFDS.OBSOLETA);
				repositorio.guardar(fds);
				eventPublisher.publicar(fds.pullDomainEvents(agora, autenticacao.utilizadorAtual().orElse(null)));
				marcadas++;
			}
		}
		return marcadas;
	}
}
