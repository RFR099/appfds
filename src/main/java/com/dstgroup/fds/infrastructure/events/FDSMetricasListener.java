package com.dstgroup.fds.infrastructure.events;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import com.dstgroup.fds.application.port.out.MetricasPort;
import com.dstgroup.fds.domain.fds.EstadoFDS;
import com.dstgroup.fds.domain.fds.FDSCriadaEvent;
import com.dstgroup.fds.domain.fds.FDSEstadoAlteradoEvent;

/**
 * Reage aos Domain Events de {@code FichaDadosSeguranca} (Fase 4, Parte 4)
 * para alimentar as métricas de negócio (Fase 5, Parte 4) — a mesma ligação
 * "algo aconteceu no domínio" -&gt; "efeito colateral de infraestrutura" já
 * usada por {@link RegistarFDSAuditoriaListener} para a Auditoria, aqui
 * aplicada a métricas em vez de persistência.
 *
 * <p>Deliberadamente sem lógica de negócio nenhuma — só traduz "este evento
 * aconteceu" em "incrementa este contador". Se a Application/Domain vier um
 * dia a emitir eventos para outros agregados (Ticket, Fornecedor), este é o
 * sítio onde reagir-lhes-ia para as respetivas métricas, não dentro dos
 * casos de uso.</p>
 *
 * <p>Uma falha ao incrementar uma métrica (na prática, quase inconcebível —
 * é uma operação em memória) nunca deve abortar a transação de negócio,
 * ao contrário do que é intencional em {@code RegistarFDSAuditoriaListener}
 * para a Auditoria: uma métrica é um dado de diagnóstico, não um facto de
 * negócio que precise de ficar consistente com o resto da escrita.</p>
 */
@Component
public class FDSMetricasListener {

	private final MetricasPort metricas;

	public FDSMetricasListener(MetricasPort metricas) {
		this.metricas = metricas;
	}

	@EventListener
	public void aoCriar(FDSCriadaEvent evento) {
		metricas.incrementarFDSCriadas();
	}

	@EventListener
	public void aoAlterarEstado(FDSEstadoAlteradoEvent evento) {
		if (evento.estadoNovo() == EstadoFDS.OBSOLETA) {
			metricas.incrementarFDSMarcadasObsoletas();
		}
	}
}
