package com.dstgroup.fds.application.port.out;

import java.util.Optional;

/**
 * Port de saída (Onion): quem é o utilizador autenticado na execução atual
 * (Fase 5, Parte 2 — RF12/RNF03 "quem alterou").
 *
 * <p>Definido aqui, na Application, para que os casos de uso possam saber
 * "quem" sem depender de Spring Security nem do formato do JWT do
 * Keycloak — só a Infrastructure ({@code SpringSecurityAutenticacaoAdapter})
 * conhece esses detalhes.</p>
 *
 * <p>{@link Optional#empty()} é a resposta correta (não um erro) quando não
 * há nenhum utilizador humano associado à execução atual — por exemplo, o
 * job agendado {@code MarcarFDSObsoletasUseCase} corre numa thread sem
 * {@code SecurityContext}, porque é o sistema, não uma pessoa, a decidir
 * marcar uma FDS como obsoleta.</p>
 */
public interface AutenticacaoPort {

	Optional<String> utilizadorAtual();
}
