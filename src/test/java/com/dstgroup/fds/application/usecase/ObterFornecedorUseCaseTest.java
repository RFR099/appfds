package com.dstgroup.fds.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.dstgroup.fds.application.dto.FornecedorResponse;
import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.port.out.FornecedorRepositoryPort;
import com.dstgroup.fds.domain.fornecedor.Fornecedor;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;
import com.dstgroup.fds.domain.fornecedor.FornecedorNaoEncontradoException;
import com.dstgroup.fds.domain.fornecedor.NomeFornecedor;
import com.dstgroup.fds.domain.shared.Email;

class ObterFornecedorUseCaseTest {

	@Test
	void deveDevolverFornecedorExistentePorId() {
		Fornecedor fornecedor = Fornecedor.criar(new NomeFornecedor("3M"), new Email("a@3m.com"), null);
		FornecedorRepositoryPortFalso repositorio = new FornecedorRepositoryPortFalso();
		repositorio.porId.put(fornecedor.id(), fornecedor);
		ObterFornecedorUseCase useCase = new ObterFornecedorUseCase(repositorio);

		FornecedorResponse resposta = useCase.executar(fornecedor.id().toString());

		assertThat(resposta.id()).isEqualTo(fornecedor.id().toString());
		assertThat(resposta.nome()).isEqualTo("3M");
		assertThat(resposta.email()).isEqualTo("a@3m.com");
	}

	@Test
	void deveLancarExcecaoDeNaoEncontradoSeIdInexistente() {
		FornecedorRepositoryPortFalso repositorio = new FornecedorRepositoryPortFalso();
		ObterFornecedorUseCase useCase = new ObterFornecedorUseCase(repositorio);
		String idInexistente = UUID.randomUUID().toString();

		assertThatThrownBy(() -> useCase.executar(idInexistente))
				.isInstanceOf(FornecedorNaoEncontradoException.class)
				.hasMessageContaining(idInexistente);
	}

	private static class FornecedorRepositoryPortFalso implements FornecedorRepositoryPort {
		private final Map<FornecedorId, Fornecedor> porId = new HashMap<>();

		@Override
		public void guardar(Fornecedor fornecedor) {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}

		@Override
		public Optional<Fornecedor> obterPorId(FornecedorId id) {
			return Optional.ofNullable(porId.get(id));
		}

		@Override
		public Pagina<Fornecedor> listar(int pagina, int tamanho) {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}
	}
}
