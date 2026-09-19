package com.dstgroup.fds.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import com.dstgroup.fds.application.dto.AdicionarImagemFDSCommand;
import com.dstgroup.fds.application.dto.FDSResponse;
import com.dstgroup.fds.application.dto.FiltroFDS;
import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.port.out.AutenticacaoPort;
import com.dstgroup.fds.application.port.out.EventPublisherPort;
import com.dstgroup.fds.application.port.out.FDSRepositoryPort;
import com.dstgroup.fds.application.port.out.ImagemStoragePort;
import com.dstgroup.fds.domain.fds.DataValidade;
import com.dstgroup.fds.domain.fds.EstadoFDS;
import com.dstgroup.fds.domain.fds.FDSId;
import com.dstgroup.fds.domain.fds.FDSNaoEncontradaException;
import com.dstgroup.fds.domain.fds.FichaDadosSeguranca;
import com.dstgroup.fds.domain.fds.FichaDadosSegurancaNaoEditavelException;
import com.dstgroup.fds.domain.fds.ImagemProdutoInvalidaException;
import com.dstgroup.fds.domain.fds.Marca;
import com.dstgroup.fds.domain.fds.PictogramaPerigo;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;
import com.dstgroup.fds.domain.shared.DomainEvent;
import com.dstgroup.fds.domain.shared.Email;

class AdicionarImagemFDSUseCaseTest {

	/** Fixo (Fase 5, Parte 2) — o valor em si é irrelevante nestes testes, só o determinismo do construtor. */
	private static final Clock RELOGIO_FIXO = Clock.fixed(Instant.parse("2026-06-01T10:00:00Z"), ZoneOffset.UTC);
	private static final AutenticacaoPort AUTENTICACAO_FALSA = new AutenticacaoPortFalso("gestor.dev");

	@Test
	void deveGuardarBinarioEAssociarImagemAFDS() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto X", new Marca("3M"),
				null, null, null, null, null);
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(fds);
		ImagemStoragePortFalso storage = new ImagemStoragePortFalso("/uploads/fds/gerado-123.png");
		AdicionarImagemFDSUseCase useCase = new AdicionarImagemFDSUseCase(repositorio, storage,
				new EventPublisherPortFalso(), RELOGIO_FIXO, AUTENTICACAO_FALSA);
		byte[] conteudo = new byte[1024];

		FDSResponse resposta = useCase.executar(
				new AdicionarImagemFDSCommand(fds.id().toString(), conteudo, "foto.png", "image/png"));

		assertThat(resposta.imagemCaminho()).isEqualTo("/uploads/fds/gerado-123.png");
		assertThat(resposta.imagemTipoMime()).isEqualTo("image/png");
		assertThat(repositorio.foiGuardada).isTrue();
	}

	@Test
	void deveChamarOStorageComOsDadosCorretos() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto X", new Marca("3M"),
				null, null, null, null, null);
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(fds);
		ImagemStoragePortFalso storage = new ImagemStoragePortFalso("/qualquer.png");
		AdicionarImagemFDSUseCase useCase = new AdicionarImagemFDSUseCase(repositorio, storage,
				new EventPublisherPortFalso(), RELOGIO_FIXO, AUTENTICACAO_FALSA);
		byte[] conteudo = new byte[2048];

		useCase.executar(new AdicionarImagemFDSCommand(fds.id().toString(), conteudo, "foto.png", "image/jpeg"));

		assertThat(storage.conteudoRecebido).isSameAs(conteudo);
		assertThat(storage.nomeOriginalRecebido).isEqualTo("foto.png");
		assertThat(storage.tipoMimeRecebido).isEqualTo("image/jpeg");
	}

	@Test
	void deveLancarExcecaoQuandoFDSNaoExiste() {
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(null);
		ImagemStoragePortFalso storage = new ImagemStoragePortFalso("/x.png");
		AdicionarImagemFDSUseCase useCase = new AdicionarImagemFDSUseCase(repositorio, storage,
				new EventPublisherPortFalso(), RELOGIO_FIXO, AUTENTICACAO_FALSA);
		String idInexistente = UUID.randomUUID().toString();

		assertThatThrownBy(() -> useCase.executar(
				new AdicionarImagemFDSCommand(idInexistente, new byte[10], "foto.png", "image/png")))
				.isInstanceOf(FDSNaoEncontradaException.class);
	}

	@Test
	void deveLancarExcecaoQuandoFDSNaoEstaEmRascunho() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto Completo", new Marca("3M"),
				FornecedorId.gerar(), new Email("a@x.pt"),
				new DataValidade(LocalDate.of(2026, 1, 1), LocalDate.of(2027, 1, 1)),
				Set.of(PictogramaPerigo.CORROSIVOS), null);
		fds.atualizarPara(EstadoFDS.ATUALIZADA);
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(fds);
		ImagemStoragePortFalso storage = new ImagemStoragePortFalso("/x.png");
		AdicionarImagemFDSUseCase useCase = new AdicionarImagemFDSUseCase(repositorio, storage,
				new EventPublisherPortFalso(), RELOGIO_FIXO, AUTENTICACAO_FALSA);

		assertThatThrownBy(() -> useCase.executar(
				new AdicionarImagemFDSCommand(fds.id().toString(), new byte[10], "foto.png", "image/png")))
				.isInstanceOf(FichaDadosSegurancaNaoEditavelException.class);
	}

	@Test
	void devePublicarListaDeEventosApósGuardarMesmoQueVazia() {
		// definirImagem nunca emite Domain Events hoje — mas o use case chama
		// sempre publicar(), mesmo com lista vazia (Fase 4, Parte 4).
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto X", new Marca("3M"),
				null, null, null, null, null);
		// Drena o FDSCriadaEvent gerado pela própria criação do fixture,
		// simulando uma FDS já persistida antes deste caso de uso correr.
		fds.pullDomainEvents(Instant.now(RELOGIO_FIXO), null);
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(fds);
		ImagemStoragePortFalso storage = new ImagemStoragePortFalso("/uploads/fds/gerado-123.png");
		EventPublisherPortFalso publicador = new EventPublisherPortFalso();
		AdicionarImagemFDSUseCase useCase = new AdicionarImagemFDSUseCase(repositorio, storage, publicador,
				RELOGIO_FIXO, AUTENTICACAO_FALSA);

		useCase.executar(new AdicionarImagemFDSCommand(fds.id().toString(), new byte[10], "foto.png", "image/png"));

		assertThat(publicador.foiChamado).isTrue();
		assertThat(publicador.eventosPublicados).isEmpty();
	}

	@Test
	void deveRejeitarTipoMimeNaoSuportado() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto X", new Marca("3M"),
				null, null, null, null, null);
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(fds);
		ImagemStoragePortFalso storage = new ImagemStoragePortFalso("/x.pdf");
		AdicionarImagemFDSUseCase useCase = new AdicionarImagemFDSUseCase(repositorio, storage,
				new EventPublisherPortFalso(), RELOGIO_FIXO, AUTENTICACAO_FALSA);

		assertThatThrownBy(() -> useCase.executar(
				new AdicionarImagemFDSCommand(fds.id().toString(), new byte[10], "doc.pdf", "application/pdf")))
				.isInstanceOf(ImagemProdutoInvalidaException.class);
	}

	@Test
	void deveRejeitarConteudoAcimaDoTamanhoMaximo() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto X", new Marca("3M"),
				null, null, null, null, null);
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(fds);
		ImagemStoragePortFalso storage = new ImagemStoragePortFalso("/x.png");
		AdicionarImagemFDSUseCase useCase = new AdicionarImagemFDSUseCase(repositorio, storage,
				new EventPublisherPortFalso(), RELOGIO_FIXO, AUTENTICACAO_FALSA);
		byte[] conteudoDemasiadoGrande = new byte[6 * 1024 * 1024]; // 6 MB, limite é 5 MB

		assertThatThrownBy(() -> useCase.executar(
				new AdicionarImagemFDSCommand(fds.id().toString(), conteudoDemasiadoGrande, "foto.png", "image/png")))
				.isInstanceOf(ImagemProdutoInvalidaException.class);
	}

	private static class FDSRepositoryPortFalso implements FDSRepositoryPort {
		private final Map<FDSId, FichaDadosSeguranca> porId = new HashMap<>();
		private boolean foiGuardada = false;

		FDSRepositoryPortFalso(FichaDadosSeguranca fds) {
			if (fds != null) {
				porId.put(fds.id(), fds);
			}
		}

		@Override
		public boolean existeDuplicado(String nomeProdutoQuimico, Marca marca, FornecedorId fornecedorId) {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}

		@Override
		public void guardar(FichaDadosSeguranca fds) {
			foiGuardada = true;
			porId.put(fds.id(), fds);
		}

		@Override
		public Optional<FichaDadosSeguranca> obterPorId(FDSId id) {
			return Optional.ofNullable(porId.get(id));
		}

		@Override
		public Pagina<FichaDadosSeguranca> listar(FiltroFDS filtro, int pagina, int tamanho) {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}

		@Override
		public java.util.List<FichaDadosSeguranca> listarCandidatasAObsolescencia() {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}
	}

	private static class ImagemStoragePortFalso implements ImagemStoragePort {
		private final String caminhoConfigurado;
		private byte[] conteudoRecebido;
		private String nomeOriginalRecebido;
		private String tipoMimeRecebido;

		ImagemStoragePortFalso(String caminhoConfigurado) {
			this.caminhoConfigurado = caminhoConfigurado;
		}

		@Override
		public String guardar(byte[] conteudo, String nomeOriginal, String tipoMime) {
			this.conteudoRecebido = conteudo;
			this.nomeOriginalRecebido = nomeOriginal;
			this.tipoMimeRecebido = tipoMime;
			return caminhoConfigurado;
		}
	}

	private static class EventPublisherPortFalso implements EventPublisherPort {
		private final List<DomainEvent> eventosPublicados = new ArrayList<>();
		private boolean foiChamado = false;

		@Override
		public void publicar(List<DomainEvent> eventos) {
			foiChamado = true;
			eventosPublicados.addAll(eventos);
		}
	}

	/**
	 * Fake do {@link AutenticacaoPort} (Fase 5, Parte 2) — evita depender do
	 * {@code SecurityContextHolder} do Spring Security nestes testes de
	 * Application, que não sobem nenhum contexto HTTP.
	 */
	private static class AutenticacaoPortFalso implements AutenticacaoPort {
		private final String utilizador;

		private AutenticacaoPortFalso(String utilizador) {
			this.utilizador = utilizador;
		}

		@Override
		public Optional<String> utilizadorAtual() {
			return Optional.ofNullable(utilizador);
		}
	}
}
