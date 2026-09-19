package com.dstgroup.fds.application.usecase;

import java.time.Clock;
import java.time.Instant;

import com.dstgroup.fds.application.FDSMapper;
import com.dstgroup.fds.application.dto.AdicionarImagemFDSCommand;
import com.dstgroup.fds.application.dto.FDSResponse;
import com.dstgroup.fds.application.port.out.AutenticacaoPort;
import com.dstgroup.fds.application.port.out.EventPublisherPort;
import com.dstgroup.fds.application.port.out.FDSRepositoryPort;
import com.dstgroup.fds.application.port.out.ImagemStoragePort;
import com.dstgroup.fds.domain.fds.FDSId;
import com.dstgroup.fds.domain.fds.FDSNaoEncontradaException;
import com.dstgroup.fds.domain.fds.FichaDadosSeguranca;
import com.dstgroup.fds.domain.fds.ImagemProduto;

/**
 * Caso de uso: associar uma imagem a uma FDS em {@code RASCUNHO} (campo
 * "IMAGEM DO PRODUTO QUÍMICO" do protótipo).
 *
 * <p>Orquestra, por esta ordem: (1) obter a FDS; (2) delegar o
 * armazenamento do binário ao {@link ImagemStoragePort} — a Application
 * nunca faz mais do que passar os bytes adiante; (3) construir o VO
 * {@link ImagemProduto} com o caminho devolvido, o que já valida tipo MIME e
 * tamanho; (4) associá-lo à FDS, que por sua vez rejeita se não estiver em
 * {@code RASCUNHO}; (5) persistir.</p>
 */
public class AdicionarImagemFDSUseCase {

	private final FDSRepositoryPort repositorio;
	private final ImagemStoragePort storage;
	private final EventPublisherPort eventPublisher;
	private final Clock relogio;
	private final AutenticacaoPort autenticacao;

	public AdicionarImagemFDSUseCase(FDSRepositoryPort repositorio, ImagemStoragePort storage,
			EventPublisherPort eventPublisher, Clock relogio, AutenticacaoPort autenticacao) {
		this.repositorio = repositorio;
		this.storage = storage;
		this.eventPublisher = eventPublisher;
		this.relogio = relogio;
		this.autenticacao = autenticacao;
	}

	public FDSResponse executar(AdicionarImagemFDSCommand comando) {
		FDSId id = FDSId.de(comando.fdsId());
		FichaDadosSeguranca fds = repositorio.obterPorId(id)
				.orElseThrow(() -> new FDSNaoEncontradaException(id));

		String caminho = storage.guardar(comando.conteudo(), comando.nomeOriginal(), comando.tipoMime());
		ImagemProduto imagem = new ImagemProduto(caminho, comando.tipoMime(), comando.conteudo().length);

		fds.definirImagem(imagem);

		repositorio.guardar(fds);
		eventPublisher.publicar(fds.pullDomainEvents(Instant.now(relogio), autenticacao.utilizadorAtual().orElse(null)));

		return FDSMapper.paraResponse(fds);
	}
}
