package com.dstgroup.fds.infrastructure.config;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Único ponto de todo o projeto onde se cria um {@link Clock} "real"
 * (ligado ao relógio do sistema operativo). Todo o resto — domínio,
 * application, incluindo {@code MarcarFDSObsoletasUseCase} — recebe sempre
 * um {@code Clock} injetado, nunca chama {@code Clock.systemDefaultZone()}
 * diretamente.
 *
 * <p>É esta disciplina, seguida desde {@code DataValidade} (Fase 1) e
 * {@code PoliticaValidadeFDS} (Fase 3), que torna toda a lógica de datas
 * determinística e testável sem esperas reais — só aqui, na borda da
 * Infrastructure, "agora" é decidido a sério.</p>
 */
@Configuration
public class ClockConfig {

	@Bean
	public Clock relogioDoSistema() {
		return Clock.systemDefaultZone();
	}
}
