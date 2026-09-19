package com.dstgroup.fds.infrastructure.persistence;

import java.util.Set;
import java.util.stream.Collectors;

import com.dstgroup.fds.domain.fds.DataValidade;
import com.dstgroup.fds.domain.fds.EstadoFDS;
import com.dstgroup.fds.domain.fds.FDSId;
import com.dstgroup.fds.domain.fds.FichaDadosSeguranca;
import com.dstgroup.fds.domain.fds.ImagemProduto;
import com.dstgroup.fds.domain.fds.Marca;
import com.dstgroup.fds.domain.fds.PictogramaPerigo;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;
import com.dstgroup.fds.domain.obra.ObraId;
import com.dstgroup.fds.domain.shared.Email;

/**
 * Converte entre o agregado {@link FichaDadosSeguranca} e a
 * {@link FDSJpaEntity}. Vive inteiramente na Infrastructure — o domínio nunca
 * conhece esta classe nem o JPA.
 */
final class FDSEntityMapper {

	private FDSEntityMapper() {
	}

	static FDSJpaEntity paraEntidade(FichaDadosSeguranca fds) {
		DataValidade dataValidade = fds.dataValidade();
		ImagemProduto imagem = fds.imagem();
		return new FDSJpaEntity(
				fds.id().valor(),
				fds.nomeProdutoQuimico(),
				fds.marca().nome(),
				fds.fornecedorId() == null ? null : fds.fornecedorId().valor(),
				fds.emailContacto() == null ? null : fds.emailContacto().valor(),
				fds.estado().name(),
				dataValidade == null ? null : dataValidade.dataRevisao(),
				dataValidade == null ? null : dataValidade.dataValidade(),
				fds.pictogramas().stream().map(Enum::name).collect(Collectors.toSet()),
				fds.obras().stream().map(ObraId::valor).collect(Collectors.toSet()),
				imagem == null ? null : imagem.caminho(),
				imagem == null ? null : imagem.tipoMime(),
				imagem == null ? null : imagem.tamanhoBytes(),
				fds.temDissocianatos()
		);
	}

	/**
	 * Reconstitui o agregado a partir da linha da base de dados, usando
	 * {@code FichaDadosSeguranca.reidratar(...)} — preserva o id e o estado
	 * reais tal como persistidos, sem "reencenar" transições nem gerar
	 * eventos de domínio fantasma.
	 */
	static FichaDadosSeguranca paraDominio(FDSJpaEntity entidade) {
		Marca marca = new Marca(entidade.getMarca());
		FornecedorId fornecedorId = entidade.getFornecedorId() == null
				? null : new FornecedorId(entidade.getFornecedorId());
		Email email = entidade.getEmailContacto() == null ? null : new Email(entidade.getEmailContacto());
		DataValidade dataValidade = (entidade.getDataRevisao() == null || entidade.getDataValidade() == null)
				? null : new DataValidade(entidade.getDataRevisao(), entidade.getDataValidade());
		Set<PictogramaPerigo> pictogramas = entidade.getPictogramas().stream()
				.map(PictogramaPerigo::valueOf)
				.collect(Collectors.toSet());
		Set<ObraId> obras = entidade.getObras().stream()
				.map(ObraId::new)
				.collect(Collectors.toSet());
		ImagemProduto imagem = (entidade.getImagemCaminho() == null) ? null
				: new ImagemProduto(entidade.getImagemCaminho(), entidade.getImagemTipoMime(),
						entidade.getImagemTamanhoBytes());

		return FichaDadosSeguranca.reidratar(
				new FDSId(entidade.getId()), entidade.getNomeProdutoQuimico(), marca, fornecedorId, email,
				dataValidade, pictogramas, obras, imagem, entidade.isTemDissocianatos(),
				EstadoFDS.valueOf(entidade.getEstado())
		);
	}
}
