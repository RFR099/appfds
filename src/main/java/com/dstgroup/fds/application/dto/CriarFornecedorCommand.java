package com.dstgroup.fds.application.dto;

import java.util.List;

/**
 * Comando de entrada para {@code CriarFornecedorUseCase} — usado tanto pelo
 * ecrã dedicado de gestão de fornecedores como pelo "Adicionar Fornecedor"
 * inline do formulário de FDS (RF05).
 */
public record CriarFornecedorCommand(String nome, String email, List<String> contactos) {
}
