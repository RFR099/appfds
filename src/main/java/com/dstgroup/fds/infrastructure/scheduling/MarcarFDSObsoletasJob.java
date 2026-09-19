package com.dstgroup.fds.infrastructure.scheduling;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.dstgroup.fds.application.usecase.MarcarFDSObsoletasUseCase;

/**
 * Job agendado que aplica periodicamente a {@code PoliticaValidadeFDS} a
 * todas as FDS candidatas, marcando como {@code OBSOLETA} as que já
 * expiraram (Fase 3, Parte 8 — fecha o ciclo de vida da Data de Validade).
 *
 * <p>Corre uma vez por dia, à meia-noite, por omissão — a validade de uma
 * FDS tem granularidade de dias, não faz sentido correr com mais
 * frequência. Configurável via {@code app.jobs.marcar-fds-obsoletas.cron}
 * (ver {@code application.yml}).</p>
 *
 * <p>Nada aqui decide "agora" diretamente — é o {@code MarcarFDSObsoletasUseCase}
 * que recebe o {@code Clock} (vindo de {@link com.dstgroup.fds.infrastructure.config.ClockConfig}).
 * Este job é só o gatilho: nenhuma lógica de negócio vive aqui.</p>
 */
@Component
public class MarcarFDSObsoletasJob {

	private static final Logger LOG = LoggerFactory.getLogger(MarcarFDSObsoletasJob.class);

	private final MarcarFDSObsoletasUseCase useCase;

	public MarcarFDSObsoletasJob(MarcarFDSObsoletasUseCase useCase) {
		this.useCase = useCase;
	}

	@Scheduled(cron = "${app.jobs.marcar-fds-obsoletas.cron:0 0 0 * * *}")
	public void executar() {
		int marcadas = useCase.executar();
		if (marcadas > 0) {
			LOG.info("Job de obsolescência de FDS: {} FDS marcadas como OBSOLETA.", marcadas);
		} else {
			LOG.debug("Job de obsolescência de FDS: nenhuma FDS elegível encontrada.");
		}
	}
}
