package com.dstgroup.fds;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Ponto de entrada da aplicação.
 *
 * <p>Nota de arquitetura (Onion): esta classe vive deliberadamente no package raiz
 * {@code com.dstgroup.fds}, fora de {@code domain}, {@code application},
 * {@code infrastructure} e {@code presentation}, para não criar uma dependência
 * acidental de nenhuma dessas camadas sobre o bootstrap do Spring.</p>
 *
 * <p>{@code @EnableScheduling} ativa o {@code MarcarFDSObsoletasJob} (Fase 3,
 * Parte 8) e qualquer outro {@code @Scheduled} futuro.</p>
 */
@SpringBootApplication
@EnableScheduling
public class FdsBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(FdsBackendApplication.class, args);
	}
}

