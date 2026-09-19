package com.dstgroup.fds.application.dto;

import java.util.List;

public record FornecedorResponse(String id, String nome, String email, List<String> contactos) {
}
