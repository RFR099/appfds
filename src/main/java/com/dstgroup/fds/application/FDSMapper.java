package com.dstgroup.fds.application;

import java.time.LocalDate;
import java.util.Set;
import java.util.stream.Collectors;

import com.dstgroup.fds.application.dto.FDSResponse;
import com.dstgroup.fds.application.dto.FDSResumoResponse;
import com.dstgroup.fds.domain.fds.DataValidade;
import com.dstgroup.fds.domain.fds.FichaDadosSeguranca;
import com.dstgroup.fds.domain.fds.ImagemProduto;

/**
 * Converte o agregado {@link FichaDadosSeguranca} para os DTOs de saída da
 * Application. Mantém o domínio inteiramente alheio ao formato de resposta
 * HTTP/JSON — se a API mudar de forma, só este mapper (e os DTOs) mudam.
 */
public final class FDSMapper {

	private FDSMapper() {
	}

	public static FDSResponse paraResponse(FichaDadosSeguranca fds) {
		DataValidade dataValidade = fds.dataValidade();
		ImagemProduto imagem = fds.imagem();
		return new FDSResponse(
				fds.id().toString(),
				fds.nomeProdutoQuimico(),
				fds.marca().nome(),
				fds.fornecedorId() == null ? null : fds.fornecedorId().toString(),
				fds.emailContacto() == null ? null : fds.emailContacto().valor(),
				fds.estado().name(),
				dataValidade == null ? null : dataValidade.dataRevisao(),
				dataValidade == null ? null : dataValidade.dataValidade(),
				paraNomesDePictogramas(fds),
				paraIdsDeObras(fds),
				imagem == null ? null : imagem.caminho(),
				imagem == null ? null : imagem.tipoMime(),
				fds.temDissocianatos()
		);
	}

	public static FDSResumoResponse paraResumo(FichaDadosSeguranca fds) {
		LocalDate dataRevisao = fds.dataValidade() == null ? null : fds.dataValidade().dataRevisao();
		return new FDSResumoResponse(
				fds.id().toString(),
				fds.nomeProdutoQuimico(),
				fds.marca().nome(),
				fds.fornecedorId() == null ? null : fds.fornecedorId().toString(),
				fds.estado().name(),
				dataRevisao
		);
	}

	private static Set<String> paraNomesDePictogramas(FichaDadosSeguranca fds) {
		return fds.pictogramas().stream()
				.map(Enum::name)
				.collect(Collectors.toUnmodifiableSet());
	}

	private static Set<String> paraIdsDeObras(FichaDadosSeguranca fds) {
		return fds.obras().stream()
				.map(Object::toString)
				.collect(Collectors.toUnmodifiableSet());
	}
}
