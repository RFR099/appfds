package com.dstgroup.fds.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.dstgroup.fds.application.dto.FDSResponse;
import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.port.out.FDSRepositoryPort;
import com.dstgroup.fds.domain.fds.FDSId;
import com.dstgroup.fds.domain.fds.FDSNaoEncontradaException;
import com.dstgroup.fds.domain.fds.FichaDadosSeguranca;
import com.dstgroup.fds.domain.fds.Marca;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;

class ObterFDSUseCaseTest {

	@Test
	void deveDevolverFDSExistentePorId() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("SprayMount", new Marca("3M"),
				null, null, null, null, null);
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso();
		repositorio.fdsPorId.put(fds.id(), fds);
		ObterFDSUseCase useCase = new ObterFDSUseCase(repositorio);

		FDSResponse resposta = useCase.executar(fds.id().toString());

		assertThat(resposta.id()).isEqualTo(fds.id().toString());
		assertThat(resposta.nomeProdutoQuimico()).isEqualTo("SprayMount");
		assertThat(resposta.marca()).isEqualTo("3M");
	}

	@Test
	void deveLancarExcecaoDeNaoEncontradoSeIdInexistente() {
		FDSRepositoryPortFalso repositorio = new FDSRepositoryPortFalso();
		ObterFDSUseCase useCase = new ObterFDSUseCase(repositorio);
		String idInexistente = UUID.randomUUID().toString();

		assertThatThrownBy(() -> useCase.executar(idInexistente))
				.isInstanceOf(FDSNaoEncontradaException.class)
				.hasMessageContaining(idInexistente);
	}

	private static class FDSRepositoryPortFalso implements FDSRepositoryPort {
		private final java.util.Map<FDSId, FichaDadosSeguranca> fdsPorId = new java.util.HashMap<>();

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
			return Optional.ofNullable(fdsPorId.get(id));
		}

		@Override
		public Pagina<FichaDadosSeguranca> listar(com.dstgroup.fds.application.dto.FiltroFDS filtro, int pagina, int tamanho) {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}

		@Override
		public java.util.List<FichaDadosSeguranca> listarCandidatasAObsolescencia() {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}
	}
}
