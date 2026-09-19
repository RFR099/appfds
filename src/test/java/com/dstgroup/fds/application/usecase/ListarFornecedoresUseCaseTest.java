package com.dstgroup.fds.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import com.dstgroup.fds.application.dto.FornecedorResumoResponse;
import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.port.out.FornecedorRepositoryPort;
import com.dstgroup.fds.domain.fornecedor.Fornecedor;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;
import com.dstgroup.fds.domain.fornecedor.NomeFornecedor;
import com.dstgroup.fds.domain.shared.Email;

class ListarFornecedoresUseCaseTest {

	@Test
	void deveListarComPaginacaoBasica() {
		Fornecedor a = Fornecedor.criar(new NomeFornecedor("3M"), new Email("a@3m.com"), null);
		Fornecedor b = Fornecedor.criar(new NomeFornecedor("A2Brios"), new Email("b@a2brios.pt"), null);
		FornecedorRepositoryPortFalso repositorio = new FornecedorRepositoryPortFalso(
				new Pagina<>(List.of(a, b), 0, 20, 2));
		ListarFornecedoresUseCase useCase = new ListarFornecedoresUseCase(repositorio);

		Pagina<FornecedorResumoResponse> resposta = useCase.executar(0, 20);

		assertThat(resposta.conteudo()).hasSize(2);
		assertThat(resposta.conteudo().get(0).nome()).isEqualTo("3M");
		assertThat(resposta.totalElementos()).isEqualTo(2);
	}

	@Test
	void deveNormalizarParametrosDePaginacaoInvalidos() {
		FornecedorRepositoryPortFalso repositorio = new FornecedorRepositoryPortFalso(Pagina.vazia(0, 20));
		ListarFornecedoresUseCase useCase = new ListarFornecedoresUseCase(repositorio);

		useCase.executar(-5, 10_000);

		assertThat(repositorio.paginaRecebida).isEqualTo(0);
		assertThat(repositorio.tamanhoRecebido).isEqualTo(100);
	}

	private static class FornecedorRepositoryPortFalso implements FornecedorRepositoryPort {
		private final Pagina<Fornecedor> configurada;
		private int paginaRecebida;
		private int tamanhoRecebido;

		FornecedorRepositoryPortFalso(Pagina<Fornecedor> configurada) {
			this.configurada = configurada;
		}

		@Override
		public void guardar(Fornecedor fornecedor) {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}

		@Override
		public Optional<Fornecedor> obterPorId(FornecedorId id) {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}

		@Override
		public Pagina<Fornecedor> listar(int pagina, int tamanho) {
			this.paginaRecebida = pagina;
			this.tamanhoRecebido = tamanho;
			return configurada;
		}
	}
}
