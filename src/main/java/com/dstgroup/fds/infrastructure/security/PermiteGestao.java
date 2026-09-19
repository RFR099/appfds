package com.dstgroup.fds.infrastructure.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.springframework.security.access.prepost.PreAuthorize;

/**
 * Meta-anotação de autorização (Fase 5, Parte 1 — RBAC): operações de
 * gestão do dia-a-dia (criar/atualizar FDS, abrir tickets, ver alertas e
 * auditoria) — {@code fds-gestor} ou {@code fds-admin}, nunca
 * {@code fds-operador} (RF-transversal: "Gestor de segurança: cria/atualiza
 * FDS, tickets e alertas", ver {@code keycloak/realm-fds.json}).
 *
 * <p>Ver {@link PermiteConsulta} para a justificação de centralizar aqui a
 * expressão SpEL em vez de a repetir em cada {@code @PreAuthorize}.</p>
 */
@Target({ ElementType.METHOD, ElementType.TYPE })
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("hasAnyRole('FDS-GESTOR', 'FDS-ADMIN')")
public @interface PermiteGestao {
}
