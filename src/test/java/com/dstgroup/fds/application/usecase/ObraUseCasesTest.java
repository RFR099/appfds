package com.dstgroup.fds.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.dstgroup.fds.application.dto.CriarObraCommand;
import com.dstgroup.fds.application.dto.CriarObraResponse;
import com.dstgroup.fds.application.dto.ObraResponse;
import com.dstgroup.fds.application.dto.ObraResumoResponse;
import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.port.out.ObraRepositoryPort;
import com.dstgroup.fds.domain.obra.CentroProdutivoId;
import com.dstgroup.fds.domain.obra.Obra;
import com.dstgroup.fds.domain.obra.ObraId;
import com.dstgroup.fds.domain.obra.ObraNaoEncontradaException;

class ObraUseCasesTest {

	@Test
	void criarDeveGuardarEDevolverId() {
		CentroProdutivoId centroId = CentroProdutivoId.gerar();
		RepositorioFalso repositorio = new RepositorioFalso();
		CriarObraUseCase useCase = new CriarObraUseCase(repositorio);

		CriarObraResponse resposta = useCase.executar(
				new CriarObraCommand("Estaleiro Ponte Norte", centroId.toString()));

		assertThat(resposta.id()).isNotBlank();
		assertThat(repositorio.guardada.nome()).isEqualTo("Estaleiro Ponte Norte");
		assertThat(repositorio.guardada.centroProdutivoId()).isEqualTo(centroId);
	}

	@Test
	void obterDeveDevolverExistente() {
		Obra obra = Obra.criar("Estaleiro Ponte Norte", CentroProdutivoId.gerar());
		RepositorioFalso repositorio = new RepositorioFalso();
		repositorio.porId.put(obra.id(), obra);
		ObterObraUseCase useCase = new ObterObraUseCase(repositorio);

		ObraResponse resposta = useCase.executar(obra.id().toString());

		assertThat(resposta.nome()).isEqualTo("Estaleiro Ponte Norte");
	}

	@Test
	void obterDeveLancarExcecaoSeInexistente() {
		RepositorioFalso repositorio = new RepositorioFalso();
		ObterObraUseCase useCase = new ObterObraUseCase(repositorio);
		String idInexistente = UUID.randomUUID().toString();

		assertThatThrownBy(() -> useCase.executar(idInexistente))
				.isInstanceOf(ObraNaoEncontradaException.class)
				.hasMessageContaining(idInexistente);
	}

	@Test
	void listarDeveDevolverResumosPaginados() {
		CentroProdutivoId centroId = CentroProdutivoId.gerar();
		Obra a = Obra.criar("Estaleiro A", centroId);
		Obra b = Obra.criar("Estaleiro B", centroId);
		RepositorioFalso repositorio = new RepositorioFalso();
		repositorio.paginaConfigurada = new Pagina<>(List.of(a, b), 0, 20, 2);
		ListarObrasUseCase useCase = new ListarObrasUseCase(repositorio);

		Pagina<ObraResumoResponse> resposta = useCase.executar(0, 20);

		assertThat(resposta.conteudo()).hasSize(2);
		assertThat(resposta.conteudo().get(0).nome()).isEqualTo("Estaleiro A");
	}

	private static class RepositorioFalso implements ObraRepositoryPort {
		private final Map<ObraId, Obra> porId = new HashMap<>();
		private Obra guardada;
		private Pagina<Obra> paginaConfigurada;

		@Override
		public void guardar(Obra obra) {
			this.guardada = obra;
		}

		@Override
		public Optional<Obra> obterPorId(ObraId id) {
			return Optional.ofNullable(porId.get(id));
		}

		@Override
		public Pagina<Obra> listar(int pagina, int tamanho) {
			return paginaConfigurada;
		}
	}
}
