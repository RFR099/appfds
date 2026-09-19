package com.dstgroup.fds.infrastructure.persistence;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

interface FDSJpaRepository extends JpaRepository<FDSJpaEntity, UUID>, JpaSpecificationExecutor<FDSJpaEntity> {

	boolean existsByNomeProdutoQuimicoIgnoreCaseAndMarcaIgnoreCaseAndFornecedorId(
			String nomeProdutoQuimico, String marca, UUID fornecedorId);
}
