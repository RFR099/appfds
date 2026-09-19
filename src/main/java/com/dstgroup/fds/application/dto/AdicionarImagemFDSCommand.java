package com.dstgroup.fds.application.dto;

/**
 * Comando de entrada para {@code AdicionarImagemFDSUseCase}.
 *
 * <p>Nota: por conter um {@code byte[]}, este record não deve ser comparado
 * por {@code equals}/usado como chave — é um transportador de dados de um
 * único uso (o pedido de upload), não um Value Object.</p>
 */
public record AdicionarImagemFDSCommand(String fdsId, byte[] conteudo, String nomeOriginal, String tipoMime) {
}
