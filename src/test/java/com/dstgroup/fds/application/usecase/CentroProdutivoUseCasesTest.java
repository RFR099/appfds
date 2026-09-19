package com.dstgroup.fds.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.dstgroup.fds.application.dto.CentroProdutivoResponse;
import com.dstgroup.fds.application.dto.CentroProdutivoResumoResponse;
import com.dstgroup.fds.application.dto.CriarCentroProdutivoCommand;
import com.dstgroup.fds.application.dto.CriarCentroProdutivoResponse;
import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.port.out.CentroProdutivoRepositoryPort;
import com.dstgroup.fds.domain.obra.CentroProdutivo;
import com.dstgroup.fds.domain.obra.CentroProdutivoId;
import com.dstgroup.fds.domain.obra.CentroProdutivoNaoEncontradoException;

class CentroProdutivoUseCasesTest {

	@Test
	void criarDeveGuardarEDevolverId() {
		RepositorioFalso repositorio = new RepositorioFalso();
		CriarCentroProdutivoUseCase useCase = new CriarCentroProdutivoUseCase(repositorio);

		CriarCentroProdutivoResponse resposta = useCase.executar(
				new CriarCentroProdutivoCommand("Fábrica Norte", "Braga"));

		assertThat(resposta.id()).isNotBlank();
		assertThat(repositorio.guardado.nome()).isEqualTo("Fábrica Norte");
	}

	@Test
	void obterDeveDevolverExistente() {
		CentroProdutivo centro = CentroProdutivo.criar("Fábrica Norte", "Braga");
		RepositorioFalso repositorio = new RepositorioFalso();
		repositorio.porId.put(centro.id(), centro);
		ObterCentroProdutivoUseCase useCase = new ObterCentroProdutivoUseCase(repositorio);

		CentroProdutivoResponse resposta = useCase.executar(centro.id().toString());

		assertThat(resposta.nome()).isEqualTo("Fábrica Norte");
		assertThat(resposta.localizacao()).isEqualTo("Braga");
	}

	@Test
	void obterDeveLancarExcecaoSeInexistente() {
		RepositorioFalso repositorio = new RepositorioFalso();
		ObterCentroProdutivoUseCase useCase = new ObterCentroProdutivoUseCase(repositorio);
		String idInexistente = UUID.randomUUID().toString();

		assertThatThrownBy(() -> useCase.executar(idInexistente))
				.isInstanceOf(CentroProdutivoNaoEncontradoException.class)
				.hasMessageContaining(idInexistente);
	}

	@Test
	void listarDeveDevolverResumosPaginados() {
		CentroProdutivo a = CentroProdutivo.criar("Fábrica Norte", "Braga");
		CentroProdutivo b = CentroProdutivo.criar("Fábrica Sul", "Faro");
		RepositorioFalso repositorio = new RepositorioFalso();
		repositorio.paginaConfigurada = new Pagina<>(List.of(a, b), 0, 20, 2);
		ListarCentrosProdutivosUseCase useCase = new ListarCentrosProdutivosUseCase(repositorio);

		Pagina<CentroProdutivoResumoResponse> resposta = useCase.executar(0, 20);

		assertThat(resposta.conteudo()).hasSize(2);
		assertThat(resposta.conteudo().get(0).nome()).isEqualTo("Fábrica Norte");
	}

	private static class RepositorioFalso implements CentroProdutivoRepositoryPort {
		private final Map<CentroProdutivoId, CentroProdutivo> porId = new HashMap<>();
		private CentroProdutivo guardado;
		private Pagina<CentroProdutivo> paginaConfigurada;

		@Override
		public void guardar(CentroProdutivo centro) {
			this.guardado = centro;
		}

		@Override
		public Optional<CentroProdutivo> obterPorId(CentroProdutivoId id) {
			return Optional.ofNullable(porId.get(id));
		}

		@Override
		public Pagina<CentroProdutivo> listar(int pagina, int tamanho) {
			return paginaConfigurada;
		}
	}
}
