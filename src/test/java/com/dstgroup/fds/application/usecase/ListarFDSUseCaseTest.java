package com.dstgroup.fds.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import com.dstgroup.fds.application.dto.FDSResumoResponse;
import com.dstgroup.fds.application.dto.FiltroFDS;
import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.port.out.FDSRepositoryPort;
import com.dstgroup.fds.domain.fds.FDSId;
import com.dstgroup.fds.domain.fds.FichaDadosSeguranca;
import com.dstgroup.fds.domain.fds.Marca;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;

class ListarFDSUseCaseTest {

	@Test
	void deveListarComPaginacaoBasica() {
		FichaDadosSeguranca a = FichaDadosSeguranca.criarRascunho("Produto A", new Marca("3M"), null, null, null, null, null);
		FichaDadosSeguranca b = FichaDadosSeguranca.criarRascunho("Produto B", new Marca("A2Brios"), null, null, null, null, null);
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(
				new Pagina<>(List.of(a, b), 0, 20, 2)
		);
		ListarFDSUseCase useCase = new ListarFDSUseCase(repositorio);

		Pagina<FDSResumoResponse> resposta = useCase.executar(FiltroFDS.vazio(), 0, 20);

		assertThat(resposta.conteudo()).hasSize(2);
		assertThat(resposta.conteudo().get(0).nomeProdutoQuimico()).isEqualTo("Produto A");
		assertThat(resposta.totalElementos()).isEqualTo(2);
		assertThat(repositorio.paginaRecebida).isEqualTo(0);
		assertThat(repositorio.tamanhoRecebido).isEqualTo(20);
	}

	@Test
	void deveNormalizarPaginaNegativaParaZero() {
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(Pagina.vazia(0, 20));
		ListarFDSUseCase useCase = new ListarFDSUseCase(repositorio);

		useCase.executar(FiltroFDS.vazio(), -5, 20);

		assertThat(repositorio.paginaRecebida).isEqualTo(0);
	}

	@Test
	void deveLimitarTamanhoDaPaginaAoMaximoPermitido() {
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(Pagina.vazia(0, 100));
		ListarFDSUseCase useCase = new ListarFDSUseCase(repositorio);

		useCase.executar(FiltroFDS.vazio(), 0, 10_000);

		assertThat(repositorio.tamanhoRecebido).isEqualTo(100);
	}

	@Test
	void deveExigirPeloMenosUmElementoPorPagina() {
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso(Pagina.vazia(0, 1));
		ListarFDSUseCase useCase = new ListarFDSUseCase(repositorio);

		useCase.executar(FiltroFDS.vazio(), 0, 0);

		assertThat(repositorio.tamanhoRecebido).isEqualTo(1);
	}

	private static class FDSRepositoryPortFalso implements FDSRepositoryPort {
		private final Pagina<FichaDadosSeguranca> paginaConfigurada;
		private int paginaRecebida;
		private int tamanhoRecebido;

		FDSRepositoryPortFalso(Pagina<FichaDadosSeguranca> paginaConfigurada) {
			this.paginaConfigurada = paginaConfigurada;
		}

		@Override
		public boolean existeDuplicado(String nomeProdutoQuimico, Marca marca, FornecedorId fornecedorId) {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}

		@Override
		public void guardar(FichaDadosSeguranca fds) {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}

		@Override
		public Optional<FichaDadosSeguranca> obterPorId(FDSId id) {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}

		@Override
		public Pagina<FichaDadosSeguranca> listar(FiltroFDS filtro, int pagina, int tamanho) {
			this.paginaRecebida = pagina;
			this.tamanhoRecebido = tamanho;
			return paginaConfigurada;
		}

		@Override
		public java.util.List<FichaDadosSeguranca> listarCandidatasAObsolescencia() {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}
	}
}
