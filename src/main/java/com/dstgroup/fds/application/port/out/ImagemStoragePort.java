package com.dstgroup.fds.application.port.out;

/**
 * Port de saída (Onion): abstrai <b>onde</b> e <b>como</b> o binário de uma
 * imagem é guardado — filesystem local em dev, S3 (ou equivalente) em
 * produção (implementação real na Fase 3, Parte 5). A Application só conhece
 * esta interface; nunca sabe se por trás há um disco, um bucket ou outra
 * coisa qualquer.
 */
public interface ImagemStoragePort {

	/**
	 * Guarda o conteúdo binário e devolve o caminho/URL onde ficou guardado —
	 * é esse caminho que a Application usa para construir o VO
	 * {@code ImagemProduto} do domínio.
	 *
	 * @param conteudo     bytes da imagem
	 * @param nomeOriginal nome do ficheiro tal como enviado (ex.: para gerar
	 *                     um nome único ou preservar a extensão)
	 * @param tipoMime     tipo MIME declarado do ficheiro
	 */
	String guardar(byte[] conteudo, String nomeOriginal, String tipoMime);
}
