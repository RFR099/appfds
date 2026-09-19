package com.dstgroup.fds.infrastructure.persistence;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface FDSAuditoriaJpaRepository extends JpaRepository<FDSAuditoriaJpaEntity, UUID> {

	List<FDSAuditoriaJpaEntity> findByFdsIdOrderByOcorridoEmAsc(UUID fdsId);
}
