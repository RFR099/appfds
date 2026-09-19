package com.dstgroup.fds.infrastructure.persistence;

import java.util.List;

import org.springframework.stereotype.Repository;

import com.dstgroup.fds.application.port.out.AuditoriaRepositoryPort;
import com.dstgroup.fds.domain.auditoria.RegistoAuditoriaFDS;
import com.dstgroup.fds.domain.fds.FDSId;

@Repository
class AuditoriaRepositoryAdapter implements AuditoriaRepositoryPort {

	private final FDSAuditoriaJpaRepository jpaRepository;

	AuditoriaRepositoryAdapter(FDSAuditoriaJpaRepository jpaRepository) {
		this.jpaRepository = jpaRepository;
	}

	@Override
	public void registar(RegistoAuditoriaFDS registo) {
		jpaRepository.save(FDSAuditoriaEntityMapper.paraEntidade(registo));
	}

	@Override
	public List<RegistoAuditoriaFDS> listarPorFDS(FDSId fdsId) {
		return jpaRepository.findByFdsIdOrderByOcorridoEmAsc(fdsId.valor()).stream()
				.map(FDSAuditoriaEntityMapper::paraDominio)
				.toList();
	}
}
