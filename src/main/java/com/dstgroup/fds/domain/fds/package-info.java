/**
 * Núcleo de domínio da Ficha de Dados de Segurança (FDS).
 *
 * <p>Contém o agregado {@code FichaDadosSeguranca} e os Value Objects que só
 * fazem sentido aqui: {@code Marca}, {@code EstadoFDS}, {@code PictogramaPerigo},
 * {@code DataValidade}, e os respetivos Domain Events. O VO {@code Email},
 * por ser genérico e reutilizado também por {@code Fornecedor} (Fase 2), vive
 * em {@code domain.shared}.</p>
 *
 * <p><b>Regra de arquitetura (verificada por teste ArchUnit):</b> nenhuma classe
 * deste pacote pode importar {@code org.springframework.*}, {@code jakarta.persistence.*}
 * nem qualquer classe dos pacotes {@code application}, {@code infrastructure} ou
 * {@code presentation}.</p>
 */
package com.dstgroup.fds.domain.fds;
