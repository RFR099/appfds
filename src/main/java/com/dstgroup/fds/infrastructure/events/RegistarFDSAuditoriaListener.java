package com.dstgroup.fds.infrastructure.events;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import com.dstgroup.fds.application.usecase.RegistarAuditoriaUseCase;
import com.dstgroup.fds.domain.fds.FDSEstadoAlteradoEvent;

/**
 * Reage a cada {@link FDSEstadoAlteradoEvent} publicado (via
 * {@link SpringDomainEventPublisherAdapter}) e regista a transição na
 * auditoria (RF12) — a ligação entre "algo aconteceu no domínio" e "isso
 * fica no histórico" vive só aqui, nunca dentro dos use cases que mudam o
 * estado da FDS (que só sabem que emitem eventos, não quem os consome).
 *
 * <p>Por defeito, um {@code @EventListener} do Spring corre de forma
 * síncrona, na mesma chamada de quem publicou o evento — ou seja, dentro da
 * mesma transação HTTP (ou execução do job agendado) que mudou o estado da
 * FDS. Isto é intencional: se a escrita da auditoria falhar, é preferível
 * que a operação inteira falhe (e nada fique inconsistente) a "perder"
 * silenciosamente uma entrada de auditoria.</p>
 */
@Component
public class RegistarFDSAuditoriaListener {

	private final RegistarAuditoriaUseCase registarAuditoriaUseCase;

	public RegistarFDSAuditoriaListener(RegistarAuditoriaUseCase registarAuditoriaUseCase) {
		this.registarAuditoriaUseCase = registarAuditoriaUseCase;
	}

	@EventListener
	public void aoAlterarEstado(FDSEstadoAlteradoEvent evento) {
		registarAuditoriaUseCase.executar(evento.fdsId(), evento.estadoAnterior(), evento.estadoNovo(),
				evento.ocorridoEm(), evento.utilizador());
	}
}
