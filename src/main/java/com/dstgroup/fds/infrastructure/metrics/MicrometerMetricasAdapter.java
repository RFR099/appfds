package com.dstgroup.fds.infrastructure.metrics;

import org.springframework.stereotype.Component;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;

import com.dstgroup.fds.application.port.out.MetricasPort;

/**
 * Adapter de saída (Onion) de {@link MetricasPort} usando Micrometer (Fase
 * 5, Parte 4) — {@code MeterRegistry} chega já autoconfigurado pelo
 * {@code spring-boot-starter-actuator} (dependência já existente desde o
 * início do projeto, mas até esta parte nunca usada para métricas de
 * negócio).
 *
 * <p>Os {@link Counter} são construídos uma única vez no arranque (no
 * construtor) e só incrementados depois — é o padrão recomendado pelo
 * Micrometer, para não recriar/procurar o {@code Counter} no registo a cada
 * chamada.</p>
 *
 * <p>Exposta em {@code /actuator/metrics/fds.criadas},
 * {@code /actuator/metrics/fds.marcadas.obsoletas} e
 * {@code /actuator/metrics/tickets.abertos} (ver
 * {@code management.endpoints.web.exposure.include} em
 * {@code application.yml}).</p>
 */
@Component
public class MicrometerMetricasAdapter implements MetricasPort {

	private final Counter fdsCriadas;
	private final Counter fdsMarcadasObsoletas;
	private final Counter ticketsAbertos;

	public MicrometerMetricasAdapter(MeterRegistry registry) {
		this.fdsCriadas = Counter.builder("fds.criadas")
				.description("Número de Fichas de Dados de Segurança criadas (RF01).")
				.register(registry);
		this.fdsMarcadasObsoletas = Counter.builder("fds.marcadas.obsoletas")
				.description("Número de FDS marcadas como OBSOLETA (RF08/RF09).")
				.register(registry);
		this.ticketsAbertos = Counter.builder("tickets.abertos")
				.description("Número de tickets de pedido de FDS a fornecedores abertos (RF07).")
				.register(registry);
	}

	@Override
	public void incrementarFDSCriadas() {
		fdsCriadas.increment();
	}

	@Override
	public void incrementarFDSMarcadasObsoletas() {
		fdsMarcadasObsoletas.increment();
	}

	@Override
	public void incrementarTicketsAbertos() {
		ticketsAbertos.increment();
	}
}
