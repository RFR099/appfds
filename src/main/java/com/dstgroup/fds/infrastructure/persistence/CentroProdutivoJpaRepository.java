package com.dstgroup.fds.infrastructure.persistence;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface CentroProdutivoJpaRepository extends JpaRepository<CentroProdutivoJpaEntity, UUID> {
}
