package com.dstgroup.fds.infrastructure.health;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.Status;

/**
 * Testa {@link ImagemStorageHealthIndicator} invocando {@code health()}
 * diretamente (sem contexto Spring nem chamada HTTP a
 * {@code /actuator/health}) — a mesma técnica de invocação direta já usada em
 * {@code GlobalExceptionHandlerTest} (Fase 5, Parte 3) e
 * {@code FDSMetricasListenerTest} (Fase 5, Parte 4): a anotação
 * {@code @Component} só importa quando é o Spring a construir o bean, o
 * método em si é uma função determinística do estado do filesystem.
 */
class ImagemStorageHealthIndicatorTest {

	@Test
	void devolveUpQuandoDiretorioExisteEEhEscrevivel(@TempDir Path diretorioTemp) {
		ImagemStorageHealthIndicator indicador = new ImagemStorageHealthIndicator(diretorioTemp.toString());

		Health resultado = indicador.health();

		assertThat(resultado.getStatus()).isEqualTo(Status.UP);
		assertThat(resultado.getDetails()).containsEntry("diretorio", diretorioTemp.toString());
	}

	@Test
	void devolveDownQuandoDiretorioNaoExiste(@TempDir Path diretorioTemp) {
		Path inexistente = diretorioTemp.resolve("nao-existe");
		ImagemStorageHealthIndicator indicador = new ImagemStorageHealthIndicator(inexistente.toString());

		Health resultado = indicador.health();

		assertThat(resultado.getStatus()).isEqualTo(Status.DOWN);
		assertThat(resultado.getDetails()).containsEntry("motivo", "o diretório não existe ou não é uma pasta");
	}

	@Test
	void devolveDownQuandoCaminhoNaoEhUmaPasta(@TempDir Path diretorioTemp) throws IOException {
		Path ficheiro = diretorioTemp.resolve("nao-e-pasta.txt");
		Files.writeString(ficheiro, "conteudo");
		ImagemStorageHealthIndicator indicador = new ImagemStorageHealthIndicator(ficheiro.toString());

		Health resultado = indicador.health();

		assertThat(resultado.getStatus()).isEqualTo(Status.DOWN);
	}

	@Test
	void devolveDownQuandoDiretorioExisteMasNaoEhEscrevivel(@TempDir Path diretorioTemp) throws IOException {
		Path somenteLeitura = diretorioTemp.resolve("somente-leitura");
		Files.createDirectory(somenteLeitura);
		Set<PosixFilePermission> semEscrita = PosixFilePermissions.fromString("r-xr-xr-x");
		Files.setPosixFilePermissions(somenteLeitura, semEscrita);
		ImagemStorageHealthIndicator indicador = new ImagemStorageHealthIndicator(somenteLeitura.toString());

		try {
			Health resultado = indicador.health();

			assertThat(resultado.getStatus()).isEqualTo(Status.DOWN);
			assertThat(resultado.getDetails())
					.containsEntry("motivo", "o diretório existe mas não tem permissão de escrita");
		} finally {
			// repor permissões de escrita para o @TempDir conseguir limpar-se sozinho
			Files.setPosixFilePermissions(somenteLeitura, PosixFilePermissions.fromString("rwxr-xr-x"));
		}
	}
}
