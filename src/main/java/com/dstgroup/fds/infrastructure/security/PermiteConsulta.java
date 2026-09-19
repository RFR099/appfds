package com.dstgroup.fds.infrastructure.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.springframework.security.access.prepost.PreAuthorize;

/**
 * Meta-anotação de autorização (Fase 5, Parte 1 — RBAC): qualquer um dos três
 * papéis do realm Keycloak pode aceder — inclui {@code fds-operador}, cujo
 * único acesso à plataforma é a consulta (RF-transversal "Operador de obra:
 * apenas consulta FDS", ver {@code keycloak/realm-fds.json}).
 *
 * <p>Centraliza aqui, num único sítio, a string de papéis usada pelo
 * {@code @PreAuthorize} — os controllers ficam a dizer "o que" (que nível de
 * acesso o endpoint exige), não "como" (a expressão SpEL exata), o que evita
 * o mesmo literal espalhado por cada método e facilita rever/alterar a
 * matriz de permissões num único lugar.</p>
 *
 * <p>Os nomes dos papéis aqui ({@code FDS-OPERADOR}, etc.) têm de coincidir
 * com o que {@link KeycloakRealmRoleConverter} produz: prefixo {@code ROLE_}
 * mais o nome do papel do realm em maiúsculas.</p>
 */
@Target({ ElementType.METHOD, ElementType.TYPE })
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("hasAnyRole('FDS-OPERADOR', 'FDS-GESTOR', 'FDS-ADMIN')")
public @interface PermiteConsulta {
}
