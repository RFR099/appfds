package com.dstgroup.fds.infrastructure.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.springframework.security.access.prepost.PreAuthorize;

/**
 * Meta-anotação de autorização (Fase 5, Parte 1 — RBAC): operações
 * estruturais/organizacionais — criar Centro Produtivo ou Obra — reservadas
 * a {@code fds-admin}. Ao contrário de Fornecedor (que o gestor pode criar
 * inline ao criar uma FDS, RF05), Centro Produtivo e Obra representam a
 * estrutura organizacional do cliente, alterada com pouca frequência; esta
 * é uma decisão de âmbito minha, não ditada por nenhum requisito explícito
 * — ver o relatório da Parte 1 para a disclosure completa.
 *
 * <p>Ver {@link PermiteConsulta} para a justificação de centralizar aqui a
 * expressão SpEL em vez de a repetir em cada {@code @PreAuthorize}.</p>
 */
@Target({ ElementType.METHOD, ElementType.TYPE })
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("hasRole('FDS-ADMIN')")
public @interface PermiteAdmin {
}
