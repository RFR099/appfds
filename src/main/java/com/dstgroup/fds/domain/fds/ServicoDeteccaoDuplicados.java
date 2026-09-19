package com.dstgroup.fds.domain.fds;

/**
 * Domain Service {@code ServicoDeteccaoDuplicados} (ver especificação
 * técnica, secção 5.6): decide se a criação de uma FDS deve ser recusada por
 * já existir outra ativa com o mesmo Nome + Marca + Fornecedor.
 *
 * <p>Não acede à base de dados — isso violaria o Onion. A verificação em si
 * ({@code existeDuplicado}) é feita pela Application através do
 * {@code FDSRepositoryPort} (que sabe consultar a base de dados); este
 * serviço só aplica a regra de negócio sobre o resultado já calculado.</p>
 */
public final class ServicoDeteccaoDuplicados {

	private ServicoDeteccaoDuplicados() {
		// utilitário estático — sem estado, não deve ser instanciado
	}

	public static void garantirNaoDuplicado(boolean existeDuplicado, String nomeProdutoQuimico, Marca marca) {
		if (existeDuplicado) {
			throw new FichaDadosSegurancaDuplicadaException(nomeProdutoQuimico, marca);
		}
	}
}
