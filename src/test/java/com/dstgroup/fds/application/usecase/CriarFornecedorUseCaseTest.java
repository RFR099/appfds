package com.dstgroup.fds.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import com.dstgroup.fds.application.dto.CriarFornecedorCommand;
import com.dstgroup.fds.application.dto.CriarFornecedorResponse;
import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.port.out.FornecedorRepositoryPort;
import com.dstgroup.fds.domain.fornecedor.Fornecedor;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;

class CriarFornecedorUseCaseTest {

	@Test
	void deveGuardarEDevolverIdAoCriarComSucesso() {
		FornecedorRepositoryPortFalso repositorio = new FornecedorRepositoryPortFalso();
		CriarFornecedorUseCase useCase = new CriarFornecedorUseCase(repositorio);
		CriarFornecedorCommand comando = new CriarFornecedorCommand("3M", "contacto@3m.com",
				List.of("+351 210 000 000"));

		CriarFornecedorResponse resposta = useCase.executar(comando);

		assertThat(resposta.id()).isNotBlank();
		assertThat(repositorio.guardado).isNotNull();
		assertThat(repositorio.guardado.nome().valor()).isEqualTo("3M");
		assertThat(repositorio.guardado.id().toString()).isEqualTo(resposta.id());
	}

	@Test
	void deveAceitarCriacaoSemContactos() {
		FornecedorRepositoryPortFalso repositorio = new FornecedorRepositoryPortFalso();
		CriarFornecedorUseCase useCase = new CriarFornecedorUseCase(repositorio);
		CriarFornecedorCommand comando = new CriarFornecedorCommand("A2Brios", "a@a2brios.pt", null);

		CriarFornecedorResponse resposta = useCase.executar(comando);

		assertThat(resposta.id()).isNotBlank();
		assertThat(repositorio.guardado.contactos()).isEmpty();
	}

	private static class FornecedorRepositoryPortFalso implements FornecedorRepositoryPort {
		private Fornecedor guardado;

		@Override
		public void guardar(Fornecedor fornecedor) {
			this.guardado = fornecedor;
		}

		@Override
		public Optional<Fornecedor> obterPorId(FornecedorId id) {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}

		@Override
		public Pagina<Fornecedor> listar(int pagina, int tamanho) {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}
	}
}
