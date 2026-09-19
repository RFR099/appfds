package com.dstgroup.fds.application.usecase;

import java.time.Clock;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

import com.dstgroup.fds.application.FDSMapper;
import com.dstgroup.fds.application.dto.AtualizarFDSCommand;
import com.dstgroup.fds.application.dto.FDSResponse;
import com.dstgroup.fds.application.port.out.AutenticacaoPort;
import com.dstgroup.fds.application.port.out.EventPublisherPort;
import com.dstgroup.fds.application.port.out.FDSRepositoryPort;
import com.dstgroup.fds.domain.fds.DataValidade;
import com.dstgroup.fds.domain.fds.FDSId;
import com.dstgroup.fds.domain.fds.FDSNaoEncontradaException;
import com.dstgroup.fds.domain.fds.FichaDadosSeguranca;
import com.dstgroup.fds.domain.fds.Marca;
import com.dstgroup.fds.domain.fds.PictogramaPerigo;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;
import com.dstgroup.fds.domain.shared.Email;

/**
 * Caso de uso: atualizar os campos de uma FDS ainda em {@code RASCUNHO}
 * (RF06 — completar/corrigir antes de finalizar).
 *
 * <p>Delega toda a regra de negócio ao agregado (métodos
 * {@code atualizar*}/{@code adicionarPictograma}/{@code removerPictograma}
 * da Fase 3, Parte 1) — incluindo a rejeição via
 * {@code FichaDadosSegurancaNaoEditavelException} se a FDS já não estiver em
 * rascunho. Este caso de uso só orquestra: obter, aplicar as alterações
 * pedidas, guardar, publicar os Domain Events pendentes (Fase 4, Parte 4) —
 * hoje sempre uma lista vazia, já que editar campos em rascunho não emite
 * eventos, mas a chamada fica feita para não ser esquecida se isso mudar.</p>
 */
public class AtualizarFDSUseCase {

	private final FDSRepositoryPort repositorio;
	private final EventPublisherPort eventPublisher;
	private final Clock relogio;
	private final AutenticacaoPort autenticacao;

	public AtualizarFDSUseCase(FDSRepositoryPort repositorio, EventPublisherPort eventPublisher, Clock relogio,
			AutenticacaoPort autenticacao) {
		this.repositorio = repositorio;
		this.eventPublisher = eventPublisher;
		this.relogio = relogio;
		this.autenticacao = autenticacao;
	}

	public FDSResponse executar(AtualizarFDSCommand comando) {
		FDSId id = FDSId.de(comando.id());
		FichaDadosSeguranca fds = repositorio.obterPorId(id)
				.orElseThrow(() -> new FDSNaoEncontradaException(id));

		if (comando.marca() != null) {
			fds.atualizarMarca(new Marca(comando.marca()));
		}
		if (comando.fornecedorId() != null) {
			// FornecedorId.de() (Fase 5, Parte 3) traduz um UUID mal formado numa
			// IdentificadorInvalidoException (400), não na IllegalArgumentException
			// crua de UUID.fromString (que resultaria em 500).
			fds.atualizarFornecedor(FornecedorId.de(comando.fornecedorId()));
		}
		if (comando.emailContacto() != null) {
			fds.atualizarEmailContacto(new Email(comando.emailContacto()));
		}
		if (comando.dataRevisao() != null && comando.dataValidade() != null) {
			fds.atualizarDataValidade(new DataValidade(comando.dataRevisao(), comando.dataValidade()));
		}
		if (comando.pictogramas() != null) {
			reconciliarPictogramas(fds, comando.pictogramas());
		}

		repositorio.guardar(fds);
		eventPublisher.publicar(fds.pullDomainEvents(Instant.now(relogio), autenticacao.utilizadorAtual().orElse(null)));

		return FDSMapper.paraResponse(fds);
	}

	/**
	 * O agregado só expõe adicionar/remover um pictograma de cada vez — este
	 * método traduz "o conjunto final deve ser X" nessas operações singulares,
	 * mantendo o agregado com uma API pequena e explícita.
	 */
	private void reconciliarPictogramas(FichaDadosSeguranca fds, Set<PictogramaPerigo> desejados) {
		Set<PictogramaPerigo> atuais = new HashSet<>(fds.pictogramas());
		for (PictogramaPerigo pictograma : desejados) {
			if (!atuais.contains(pictograma)) {
				fds.adicionarPictograma(pictograma);
			}
		}
		for (PictogramaPerigo pictograma : atuais) {
			if (!desejados.contains(pictograma)) {
				fds.removerPictograma(pictograma);
			}
		}
	}
}
