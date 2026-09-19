package com.dstgroup.fds.application.usecase;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Set;
import java.util.stream.Collectors;

import com.dstgroup.fds.application.dto.CriarFDSCommand;
import com.dstgroup.fds.application.dto.CriarFDSResponse;
import com.dstgroup.fds.application.port.out.AutenticacaoPort;
import com.dstgroup.fds.application.port.out.EventPublisherPort;
import com.dstgroup.fds.application.port.out.FDSRepositoryPort;
import com.dstgroup.fds.domain.fds.DataValidade;
import com.dstgroup.fds.domain.fds.FichaDadosSeguranca;
import com.dstgroup.fds.domain.fds.Marca;
import com.dstgroup.fds.domain.fds.ServicoDeteccaoDuplicados;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;
import com.dstgroup.fds.domain.obra.ObraId;
import com.dstgroup.fds.domain.shared.Email;

/**
 * Caso de uso: criar uma nova FDS — como rascunho incompleto ou já completa,
 * consoante os dados recebidos no {@link CriarFDSCommand}.
 *
 * <p>Orquestra, por esta ordem: (1) construir os VOs a partir dos dados crus;
 * (2) se já houver Fornecedor definido, verificar duplicados através do
 * {@link FDSRepositoryPort} e aplicar a regra via
 * {@link ServicoDeteccaoDuplicados}; (3) construir o agregado; (4) persistir;
 * (5) publicar os Domain Events que o agregado acumulou (Fase 4, Parte 4) —
 * sempre depois de persistir com sucesso, nunca antes. Não conhece Spring,
 * JPA nem HTTP — só depende de abstrações (os ports).</p>
 *
 * <p>Recebe um {@link Clock} injetado e um {@link AutenticacaoPort} (Fase 5,
 * Parte 2) — nunca {@code Instant.now()} direto nem acesso direto ao
 * {@code SecurityContext} — para fornecer o instante e o utilizador
 * autenticado a {@link FichaDadosSeguranca#pullDomainEvents(Instant, String)}
 * (RF12/RNF03 — "quem alterou").</p>
 */
public class CriarFDSUseCase {

	private final FDSRepositoryPort repositorio;
	private final EventPublisherPort eventPublisher;
	private final Clock relogio;
	private final AutenticacaoPort autenticacao;

	public CriarFDSUseCase(FDSRepositoryPort repositorio, EventPublisherPort eventPublisher, Clock relogio,
			AutenticacaoPort autenticacao) {
		this.repositorio = repositorio;
		this.eventPublisher = eventPublisher;
		this.relogio = relogio;
		this.autenticacao = autenticacao;
	}

	public CriarFDSResponse executar(CriarFDSCommand comando) {
		Marca marca = new Marca(comando.marca());
		FornecedorId fornecedorId = paraFornecedorId(comando.fornecedorId());

		// A verificação de duplicado só faz sentido quando já há um
		// Fornecedor concreto a comparar — um rascunho sem fornecedor nunca
		// é "duplicado" de nada.
		if (fornecedorId != null) {
			boolean existeDuplicado = repositorio.existeDuplicado(comando.nomeProdutoQuimico(), marca, fornecedorId);
			ServicoDeteccaoDuplicados.garantirNaoDuplicado(existeDuplicado, comando.nomeProdutoQuimico(), marca);
		}

		Email email = comando.emailContacto() == null ? null : new Email(comando.emailContacto());
		DataValidade dataValidade = paraDataValidade(comando.dataRevisao(), comando.dataValidade());
		Set<ObraId> obras = paraObras(comando.obrasIds());

		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho(
				comando.nomeProdutoQuimico(), marca, fornecedorId, email, dataValidade, comando.pictogramas(), obras
		);

		repositorio.guardar(fds);
		eventPublisher.publicar(fds.pullDomainEvents(Instant.now(relogio), autenticacao.utilizadorAtual().orElse(null)));

		return new CriarFDSResponse(fds.id().toString());
	}

	private static FornecedorId paraFornecedorId(String valor) {
		// FornecedorId.de() (Fase 5, Parte 3) traduz um UUID mal formado numa
		// IdentificadorInvalidoException (400), não na IllegalArgumentException
		// crua de UUID.fromString (que resultaria em 500).
		return valor == null ? null : FornecedorId.de(valor);
	}

	private static DataValidade paraDataValidade(LocalDate dataRevisao, LocalDate dataValidade) {
		return (dataRevisao == null || dataValidade == null) ? null : new DataValidade(dataRevisao, dataValidade);
	}

	private static Set<ObraId> paraObras(Set<String> obrasIds) {
		return obrasIds == null ? null : obrasIds.stream().map(ObraId::de).collect(Collectors.toSet());
	}
}
