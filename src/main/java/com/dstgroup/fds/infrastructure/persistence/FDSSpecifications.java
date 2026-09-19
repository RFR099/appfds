package com.dstgroup.fds.infrastructure.persistence;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.domain.Specification;

import com.dstgroup.fds.application.dto.FiltroFDS;
import com.dstgroup.fds.domain.fds.EstadoFDS;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;

/**
 * Traduz {@link FiltroFDS} para uma {@link Specification} do Spring Data JPA
 * — a única classe do projeto que sabe como o critério de pesquisa se torna
 * SQL. Se o {@code FiltroFDS} mudar de forma no futuro, só esta classe muda
 * (nem o port, nem o caso de uso, nem o controller).
 *
 * <p><b>Nome/Marca</b>: pesquisa por substring, case-insensitive (como no
 * protótipo, um campo de texto com ícone de lupa) — não uma correspondência
 * exata.</p>
 *
 * <p><b>Centro Produtivo</b>: a FDS não guarda o centro produtivo
 * diretamente (evita duplicar a associação Obra → Centro Produtivo) — filtra
 * por FDS cuja(s) Obra(s) associada(s) pertençam a esse centro, através de
 * uma subquery sobre {@code ObraJpaEntity}.</p>
 */
final class FDSSpecifications {

	private FDSSpecifications() {
	}

	static Specification<FDSJpaEntity> comFiltro(FiltroFDS filtro) {
		return (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();

			if (temTexto(filtro.nome())) {
				predicates.add(cb.like(cb.lower(root.get("nomeProdutoQuimico")),
						paraPadraoLike(filtro.nome())));
			}

			if (temTexto(filtro.marca())) {
				predicates.add(cb.like(cb.lower(root.get("marca")),
						paraPadraoLike(filtro.marca())));
			}

			if (filtro.fornecedorId() != null) {
				predicates.add(cb.equal(root.get("fornecedorId"), filtro.fornecedorId().valor()));
			}

			if (filtro.estado() != null) {
				predicates.add(cb.equal(root.get("estado"), filtro.estado().name()));
			}

			if (filtro.obraId() != null) {
				Join<FDSJpaEntity, UUID> obrasJoin = root.joinSet("obras", JoinType.INNER);
				predicates.add(cb.equal(obrasJoin, filtro.obraId().valor()));
			}

			if (filtro.centroProdutivoId() != null) {
				Subquery<UUID> obrasDoCentro = query.subquery(UUID.class);
				Root<ObraJpaEntity> obraRoot = obrasDoCentro.from(ObraJpaEntity.class);
				obrasDoCentro.select(obraRoot.get("id"))
						.where(cb.equal(obraRoot.get("centroProdutivoId"), filtro.centroProdutivoId().valor()));

				Join<FDSJpaEntity, UUID> obrasJoin = root.joinSet("obras", JoinType.INNER);
				predicates.add(obrasJoin.in(obrasDoCentro));
			}

			return cb.and(predicates.toArray(new Predicate[0]));
		};
	}

	private static boolean temTexto(String valor) {
		return valor != null && !valor.isBlank();
	}

	private static String paraPadraoLike(String valor) {
		return "%" + valor.trim().toLowerCase() + "%";
	}

	/**
	 * FDS com {@code DataValidade} definida (as duas colunas preenchidas) e
	 * num estado que ainda permite transitar para {@code OBSOLETA}. Usada
	 * pelo job agendado (Fase 3, Parte 8) — sem paginação, é uma operação de
	 * manutenção em lote.
	 */
	static Specification<FDSJpaEntity> candidatasAObsolescencia() {
		return (root, query, cb) -> cb.and(
				cb.isNotNull(root.get("dataRevisao")),
				cb.isNotNull(root.get("dataValidade")),
				root.get("estado").in(EstadoFDS.ATUALIZADA.name(), EstadoFDS.SOLICITADA_AO_FORNECEDOR.name())
		);
	}
}
