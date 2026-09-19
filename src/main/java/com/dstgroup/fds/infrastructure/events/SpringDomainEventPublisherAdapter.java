package com.dstgroup.fds.infrastructure.events;

import java.util.List;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import com.dstgroup.fds.application.port.out.EventPublisherPort;
import com.dstgroup.fds.domain.shared.DomainEvent;

/**
 * Adapter de saída (Onion): publica cada {@link DomainEvent} através do
 * {@link ApplicationEventPublisher} do Spring — o mecanismo de eventos "in
 * process" já embutido no contexto, sem precisar de uma fila externa
 * (RabbitMQ/Kafka) para o volume e a topologia atuais (um único módulo
 * monolítico).
 *
 * <p>Cada evento é publicado individualmente (não como uma lista), para que
 * um {@code @EventListener(FDSEstadoAlteradoEvent.class)} — como o que a
 * Auditoria (Fase 4, Parte 5) vai registar — possa reagir ao tipo concreto
 * do evento em vez de ter de desembrulhar uma coleção.</p>
 *
 * <p>Nota: por defeito, um {@code @EventListener} do Spring corre de forma
 * síncrona, na mesma transação/thread de quem publica. Isto é intencional
 * por agora — mantém o comportamento simples e determinístico. Se algum
 * listener futuro precisar de correr de forma assíncrona ou só depois do
 * commit da transação, isso configura-se nesse listener (ex.:
 * {@code @TransactionalEventListener}/{@code @Async}), não aqui.</p>
 */
@Component
public class SpringDomainEventPublisherAdapter implements EventPublisherPort {

	private final ApplicationEventPublisher publisher;

	public SpringDomainEventPublisherAdapter(ApplicationEventPublisher publisher) {
		this.publisher = publisher;
	}

	@Override
	public void publicar(List<DomainEvent> eventos) {
		eventos.forEach(publisher::publishEvent);
	}
}
