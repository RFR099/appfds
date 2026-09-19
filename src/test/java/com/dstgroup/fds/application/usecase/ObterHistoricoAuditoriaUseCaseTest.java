package com.dstgroup.fds.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.dstgroup.fds.application.dto.FiltroFDS;
import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.application.dto.RegistoAuditoriaResponse;
import com.dstgroup.fds.application.port.out.AuditoriaRepositoryPort;
import com.dstgroup.fds.application.port.out.FDSRepositoryPort;
import com.dstgroup.fds.domain.auditoria.RegistoAuditoriaFDS;
import com.dstgroup.fds.domain.fds.EstadoFDS;
import com.dstgroup.fds.domain.fds.FDSId;
import com.dstgroup.fds.domain.fds.FDSNaoEncontradaException;
import com.dstgroup.fds.domain.fds.FichaDadosSeguranca;
import com.dstgroup.fds.domain.fds.Marca;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;

class ObterHistoricoAuditoriaUseCaseTest {

	@Test
	void deveDevolverHistoricoOrdenadoDeUmaFDSExistente() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto X", new Marca("3M"),
				null, null, null, null, null);
		FDSRepositorioFalso fdsRepositorio = new FDSRepositorioFalso(fds);
		AuditoriaRepositorioFalso auditoriaRepositorio = new AuditoriaRepositorioFalso();
		auditoriaRepositorio.registos.add(new RegistoAuditoriaFDS(fds.id(), EstadoFDS.RASCUNHO, EstadoFDS.ATUALIZADA,
				Instant.parse("2026-06-01T10:00:00Z"), "gestor.dev"));
		auditoriaRepositorio.registos.add(new RegistoAuditoriaFDS(fds.id(), EstadoFDS.ATUALIZADA, EstadoFDS.OBSOLETA,
				Instant.parse("2026-07-01T10:00:00Z"), null));
		ObterHistoricoAuditoriaUseCase useCase = new ObterHistoricoAuditoriaUseCase(fdsRepositorio,
				auditoriaRepositorio);

		List<RegistoAuditoriaResponse> historico = useCase.executar(fds.id().toString());

		assertThat(historico).hasSize(2);
		assertThat(historico.get(0).estadoNovo()).isEqualTo("ATUALIZADA");
		assertThat(historico.get(0).utilizador()).isEqualTo("gestor.dev");
		assertThat(historico.get(1).estadoNovo()).isEqualTo("OBSOLETA");
		assertThat(historico.get(1).utilizador()).isNull();
	}

	@Test
	void deveDevolverListaVaziaSeFDSExisteMasNuncaTransitou() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("Produto X", new Marca("3M"),
				null, null, null, null, null);
		FDSRepositorioFalso fdsRepositorio = new FDSRepositorioFalso(fds);
		ObterHistoricoAuditoriaUseCase useCase = new ObterHistoricoAuditoriaUseCase(fdsRepositorio,
				new AuditoriaRepositorioFalso());

		List<RegistoAuditoriaResponse> historico = useCase.executar(fds.id().toString());

		assertThat(historico).isEmpty();
	}

	@Test
	void deveLancarExcecaoSeFDSNaoExiste() {
		FDSRepositorioFalso fdsRepositorio = new FDSRepositorioFalso(null);
		ObterHistoricoAuditoriaUseCase useCase = new ObterHistoricoAuditoriaUseCase(fdsRepositorio,
				new AuditoriaRepositorioFalso());
		String idInexistente = UUID.randomUUID().toString();

		assertThatThrownBy(() -> useCase.executar(idInexistente))
				.isInstanceOf(FDSNaoEncontradaException.class)
				.hasMessageContaining(idInexistente);
	}

	private static class FDSRepositorioFalso implements FDSRepositoryPort {
		private final Map<FDSId, FichaDadosSeguranca> porId = new HashMap<>();

		FDSRepositorioFalso(FichaDadosSeguranca fds) {
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
			throw new UnsupportedOperationException("Não usado neste teste.");
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
		public List<FichaDadosSeguranca> listarCandidatasAObsolescencia() {
			throw new UnsupportedOperationException("Não usado neste teste.");
		}
	}

	private static class AuditoriaRepositorioFalso implements AuditoriaRepositoryPort {
		private final List<RegistoAuditoriaFDS> registos = new java.util.ArrayList<>();

		@Override
		public void registar(RegistoAuditoriaFDS registo) {
			registos.add(registo);
		}

		@Override
		public List<RegistoAuditoriaFDS> listarPorFDS(FDSId fdsId) {
			return registos.stream().filter(r -> r.fdsId().equals(fdsId)).toList();
		}
	}
}
