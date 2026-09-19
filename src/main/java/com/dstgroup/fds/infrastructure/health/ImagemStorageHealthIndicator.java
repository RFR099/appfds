package com.dstgroup.fds.infrastructure.health;

import java.nio.file.Files;
import java.nio.file.Path;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

/**
 * Health check (Fase 5, Parte 4 — observabilidade) do diretório onde
 * {@code FileSystemImagemStorageAdapter} guarda as imagens dos produtos
 * químicos (RF05).
 *
 * <p>{@code FileSystemImagemStorageAdapter} só verifica (e cria) o diretório
 * uma vez, no arranque da aplicação. Isso não protege contra o diretório se
 * tornar inacessível depois — disco cheio, permissões alteradas, um volume
 * partilhado desmontado, etc. Este indicador corre a cada pedido a
 * {@code /actuator/health}, por isso deteta esse tipo de degradação em
 * produção muito mais cedo do que "o próximo upload falhou".</p>
 *
 * <p>Nome do bean → exposto automaticamente pelo Spring Boot Actuator em
 * {@code /actuator/health/imagemStorage} (sufixo {@code HealthIndicator}
 * removido, primeira letra em minúscula) — endpoint já coberto pela regra
 * {@code permitAll()} de {@code /actuator/health/**} em
 * {@link com.dstgroup.fds.infrastructure.config.SecurityConfig}, sem
 * necessitar de nenhuma alteração de segurança adicional.</p>
 *
 * <p>Deliberadamente <b>não</b> tenta criar o diretório em falta nem corrigir
 * permissões — um health check só reporta o estado, nunca modifica o sistema
 * como efeito colateral de ser consultado.</p>
 */
@Component
public class ImagemStorageHealthIndicator implements HealthIndicator {

	private final Path diretorioBase;

	public ImagemStorageHealthIndicator(
			@Value("${app.storage.imagens.dir:/tmp/fds-imagens}") String diretorioBase) {
		this.diretorioBase = Path.of(diretorioBase);
	}

	@Override
	public Health health() {
		if (!Files.isDirectory(diretorioBase)) {
			return Health.down()
					.withDetail("diretorio", diretorioBase.toString())
					.withDetail("motivo", "o diretório não existe ou não é uma pasta")
					.build();
		}
		if (!Files.isWritable(diretorioBase)) {
			return Health.down()
					.withDetail("diretorio", diretorioBase.toString())
					.withDetail("motivo", "o diretório existe mas não tem permissão de escrita")
					.build();
		}
		return Health.up()
				.withDetail("diretorio", diretorioBase.toString())
				.build();
	}
}
