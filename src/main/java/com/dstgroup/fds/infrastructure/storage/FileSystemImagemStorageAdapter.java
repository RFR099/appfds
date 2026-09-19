package com.dstgroup.fds.infrastructure.storage;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.dstgroup.fds.application.port.out.ImagemStoragePort;

/**
 * Adapter de saída (Onion): guarda o binário da imagem no filesystem local.
 *
 * <p>Adequado para desenvolvimento. Em produção, trocar por um adapter S3
 * (ou equivalente) que implemente o mesmo {@link ImagemStoragePort} — nada
 * em domain/application muda, só esta classe é substituída/adicionada.</p>
 */
@Component
public class FileSystemImagemStorageAdapter implements ImagemStoragePort {

	private final Path diretorioBase;

	public FileSystemImagemStorageAdapter(
			@Value("${app.storage.imagens.dir:/tmp/fds-imagens}") String diretorioBase) {
		this.diretorioBase = Path.of(diretorioBase);
		criarDiretorioSeNecessario();
	}

	private void criarDiretorioSeNecessario() {
		try {
			Files.createDirectories(diretorioBase);
		} catch (IOException e) {
			throw new UncheckedIOException("Não foi possível criar o diretório de imagens: " + diretorioBase, e);
		}
	}

	@Override
	public String guardar(byte[] conteudo, String nomeOriginal, String tipoMime) {
		String nomeUnico = UUID.randomUUID() + extensaoDe(nomeOriginal);
		Path destino = diretorioBase.resolve(nomeUnico);
		try {
			Files.write(destino, conteudo);
		} catch (IOException e) {
			throw new UncheckedIOException("Não foi possível guardar a imagem em " + destino, e);
		}
		return destino.toString();
	}

	private String extensaoDe(String nomeOriginal) {
		if (nomeOriginal == null) {
			return "";
		}
		int ponto = nomeOriginal.lastIndexOf('.');
		return ponto >= 0 ? nomeOriginal.substring(ponto) : "";
	}
}
