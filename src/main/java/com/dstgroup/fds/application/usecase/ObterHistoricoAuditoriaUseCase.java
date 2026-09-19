package com.dstgroup.fds.application.usecase;

import java.util.List;

import com.dstgroup.fds.application.AuditoriaMapper;
import com.dstgroup.fds.application.dto.RegistoAuditoriaResponse;
import com.dstgroup.fds.application.port.out.AuditoriaRepositoryPort;
import com.dstgroup.fds.application.port.out.FDSRepositoryPort;
import com.dstgroup.fds.domain.fds.FDSId;
import com.dstgroup.fds.domain.fds.FDSNaoEncontradaException;

/**
 * Caso de uso: obtém o histórico de auditoria (transições de estado) de uma
 * FDS (RF12, ecrã "histórico/auditoria por FDS").
 *
 * <p>Verifica primeiro que a FDS existe — devolve
 * {@link FDSNaoEncontradaException} (404) para um id inexistente, em vez de
 * uma lista vazia, que ficaria indistinguível de "existe mas nunca
 * transitou de estado".</p>
 */
public class ObterHistoricoAuditoriaUseCase {

	private final FDSRepositoryPort fdsRepositorio;
	private final AuditoriaRepositoryPort auditoriaRepositorio;

	public ObterHistoricoAuditoriaUseCase(FDSRepositoryPort fdsRepositorio,
			AuditoriaRepositoryPort auditoriaRepositorio) {
		this.fdsRepositorio = fdsRepositorio;
		this.auditoriaRepositorio = auditoriaRepositorio;
	}

	public List<RegistoAuditoriaResponse> executar(String id) {
		FDSId fdsId = FDSId.de(id);
		fdsRepositorio.obterPorId(fdsId).orElseThrow(() -> new FDSNaoEncontradaException(fdsId));

		return auditoriaRepositorio.listarPorFDS(fdsId).stream()
				.map(AuditoriaMapper::paraResponse)
				.toList();
	}
}
