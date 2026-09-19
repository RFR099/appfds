package com.dstgroup.fds.domain.fds;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.function.BiFunction;
import java.time.Instant;

import com.dstgroup.fds.domain.fornecedor.FornecedorId;
import com.dstgroup.fds.domain.obra.ObraId;
import com.dstgroup.fds.domain.shared.DomainEvent;
import com.dstgroup.fds.domain.shared.Email;

/**
 * Agregado raiz do núcleo de domínio: representa o ciclo de vida completo de
 * uma Ficha de Dados de Segurança (FDS) de um produto químico.
 *
 * <p><b>Identidade</b>: {@link FDSId}. Ao criar uma FDS nova
 * ({@link #criarRascunho}) é sempre gerado internamente — quem cria uma FDS
 * nunca escolhe o seu id. A única exceção é {@link #reidratar}, usado pela
 * Infrastructure para reconstituir uma FDS já existente com o id real
 * persistido. Duas instâncias só são iguais se partilharem o mesmo id, mesmo
 * que os restantes campos coincidam (entidade, não Value Object).</p>
 *
 * <p><b>Rascunho incompleto</b> (RF06): {@code fornecedorId}, {@code emailContacto},
 * {@code dataValidade} e {@code pictogramas} podem ser {@code null}/vazios na
 * criação — só {@code nomeProdutoQuimico} e {@code marca} são exigidos desde
 * logo. A validação completa só é aplicada ao tentar sair de
 * {@link EstadoFDS#RASCUNHO} (ver {@link #atualizarPara}).</p>
 *
 * <p><b>Obras</b> (RF11): associação opcional a {@code ObraId} — onde o
 * produto é usado. Não entra nas validações de saída de {@code RASCUNHO}
 * (uma FDS pode ficar {@code Atualizada} sem ainda estar associada a nenhuma
 * obra concreta).</p>
 */
public final class FichaDadosSeguranca {

	private final FDSId id;
	private final String nomeProdutoQuimico;
	private Marca marca;
	private FornecedorId fornecedorId;
	private Email emailContacto;
	private EstadoFDS estado;
	private DataValidade dataValidade;
	private final Set<PictogramaPerigo> pictogramas;
	private final Set<ObraId> obras;
	private ImagemProduto imagem;
	private boolean temDissocianatos;

	/**
	 * Domain Events ainda não entregues — guardados como fábricas
	 * ({@code (Instant, utilizador) -> DomainEvent}) em vez de eventos já
	 * materializados (Fase 5, Partes 2). O agregado nunca chama
	 * {@code Instant.now()} nem conhece o utilizador autenticado — ambos só
	 * são conhecidos no momento de {@link #pullDomainEvents(Instant, String)},
	 * que recebe os dois do chamador (a Application, que tem um
	 * {@code Clock} e um {@code AutenticacaoPort} injetados). Até lá, cada
	 * fábrica só sabe construir o seu evento assim que souber a que instante
	 * e utilizador correspondem — um evento que não tenha campo de
	 * utilizador ({@link FDSCriadaEvent}) simplesmente ignora o segundo
	 * parâmetro.
	 */
	private final List<BiFunction<Instant, String, DomainEvent>> eventosPendentes = new ArrayList<>();

	private FichaDadosSeguranca(FDSId id, String nomeProdutoQuimico, Marca marca, FornecedorId fornecedorId,
			Email emailContacto, DataValidade dataValidade, Set<PictogramaPerigo> pictogramas, Set<ObraId> obras,
			ImagemProduto imagem, boolean temDissocianatos, EstadoFDS estado, boolean emitirEventoDeCriacao) {
		this.id = Objects.requireNonNull(id, "O id da FDS não pode ser nulo.");
		this.nomeProdutoQuimico = validarNome(nomeProdutoQuimico);
		this.marca = Objects.requireNonNull(marca, "A marca é obrigatória.");
		this.fornecedorId = fornecedorId;
		this.emailContacto = emailContacto;
		this.dataValidade = dataValidade;
		this.pictogramas = pictogramas == null ? new HashSet<>() : new HashSet<>(pictogramas);
		this.obras = obras == null ? new HashSet<>() : new HashSet<>(obras);
		this.imagem = imagem;
		this.temDissocianatos = temDissocianatos;
		this.estado = estado;
		if (emitirEventoDeCriacao) {
			this.eventosPendentes.add((agora, utilizador) -> new FDSCriadaEvent(this.id, agora));
		}
	}

	public static FichaDadosSeguranca criarRascunho(String nomeProdutoQuimico, Marca marca,
			FornecedorId fornecedorId, Email emailContacto, DataValidade dataValidade,
			Set<PictogramaPerigo> pictogramas, Set<ObraId> obras) {
		return new FichaDadosSeguranca(FDSId.gerar(), nomeProdutoQuimico, marca, fornecedorId, emailContacto,
				dataValidade, pictogramas, obras, null, false, EstadoFDS.RASCUNHO, true);
	}

	/**
	 * Reconstitui uma FDS já existente a partir de dados persistidos.
	 *
	 * <p>Uso exclusivo do adapter de persistência (Infrastructure) ao ler da
	 * base de dados — nunca deve ser chamado por um caso de uso a criar uma
	 * FDS nova (para isso existe {@link #criarRascunho}). Ao contrário desse,
	 * preserva o {@code id} e o {@code estado} reais tal como estavam
	 * gravados, e <b>não</b> emite nenhum Domain Event — reconstituir um
	 * agregado a partir da base de dados não é, em si, um novo facto de
	 * negócio.</p>
	 */
	public static FichaDadosSeguranca reidratar(FDSId id, String nomeProdutoQuimico, Marca marca,
			FornecedorId fornecedorId, Email emailContacto, DataValidade dataValidade,
			Set<PictogramaPerigo> pictogramas, Set<ObraId> obras, ImagemProduto imagem, boolean temDissocianatos,
			EstadoFDS estado) {
		return new FichaDadosSeguranca(id, nomeProdutoQuimico, marca, fornecedorId, emailContacto, dataValidade,
				pictogramas, obras, imagem, temDissocianatos, estado, false);
	}

	private static String validarNome(String nome) {
		if (nome == null || nome.isBlank()) {
			throw new NomeProdutoQuimicoInvalidoException();
		}
		return nome.trim();
	}

	/**
	 * Transiciona a FDS para {@code novoEstado}, respeitando duas invariantes:
	 * <ol>
	 *   <li>a máquina de estados de {@link EstadoFDS} (ex.: nunca
	 *       {@code RASCUNHO -> OBSOLETA} diretamente);</li>
	 *   <li>ao <b>sair</b> de {@code RASCUNHO} (independentemente do destino),
	 *       Fornecedor, Data de Validade e pelo menos um Pictograma de Perigo
	 *       têm de estar preenchidos. Uma vez fora de {@code RASCUNHO}, as
	 *       transições seguintes (ex.: {@code ATUALIZADA -> OBSOLETA}) não
	 *       repetem esta validação.</li>
	 * </ol>
	 */
	public void atualizarPara(EstadoFDS novoEstado) {
		if (estado == EstadoFDS.RASCUNHO) {
			validarCamposObrigatoriosParaSairDeRascunho();
		}
		EstadoFDS estadoAnterior = this.estado;
		this.estado = this.estado.transicionarPara(novoEstado); // lança exceção aqui se inválido — nenhum evento é registado
		this.eventosPendentes.add((agora, utilizador) ->
				new FDSEstadoAlteradoEvent(this.id, estadoAnterior, this.estado, agora, utilizador));
	}

	private void validarCamposObrigatoriosParaSairDeRascunho() {
		StringBuilder camposEmFalta = new StringBuilder();
		if (fornecedorId == null) {
			camposEmFalta.append("Fornecedor, ");
		}
		if (dataValidade == null) {
			camposEmFalta.append("Data de Validade, ");
		}
		if (pictogramas.isEmpty()) {
			camposEmFalta.append("Pictograma de Perigo, ");
		}
		if (!camposEmFalta.isEmpty()) {
			String lista = camposEmFalta.substring(0, camposEmFalta.length() - 2);
			throw new FichaDadosSegurancaIncompletaException(
					"Não é possível sair de RASCUNHO — campos obrigatórios em falta: " + lista + "."
			);
		}
	}

	// --- Edição de um rascunho (RF06: completar/corrigir antes de finalizar) ---

	/**
	 * @throws FichaDadosSegurancaNaoEditavelException se a FDS já não estiver
	 * em {@link EstadoFDS#RASCUNHO} — uma FDS finalizada só muda de estado,
	 * nunca de conteúdo diretamente.
	 */
	public void atualizarMarca(Marca marca) {
		garantirEditavel();
		this.marca = Objects.requireNonNull(marca, "A marca é obrigatória.");
	}

	public void atualizarFornecedor(FornecedorId fornecedorId) {
		garantirEditavel();
		this.fornecedorId = fornecedorId;
	}

	public void atualizarEmailContacto(Email emailContacto) {
		garantirEditavel();
		this.emailContacto = emailContacto;
	}

	public void atualizarDataValidade(DataValidade dataValidade) {
		garantirEditavel();
		this.dataValidade = dataValidade;
	}

	public void adicionarPictograma(PictogramaPerigo pictograma) {
		garantirEditavel();
		this.pictogramas.add(Objects.requireNonNull(pictograma, "O pictograma não pode ser nulo."));
	}

	public void removerPictograma(PictogramaPerigo pictograma) {
		garantirEditavel();
		this.pictogramas.remove(pictograma);
	}

	/**
	 * @param imagem {@code null} remove a imagem associada — útil se o
	 * utilizador enganar-se no upload e quiser tirá-la antes de finalizar.
	 */
	public void definirImagem(ImagemProduto imagem) {
		garantirEditavel();
		this.imagem = imagem;
	}

	public void atualizarTemDissocianatos(boolean temDissocianatos) {
		garantirEditavel();
		this.temDissocianatos = temDissocianatos;
	}

	private void garantirEditavel() {
		if (estado != EstadoFDS.RASCUNHO) {
			throw new FichaDadosSegurancaNaoEditavelException(estado);
		}
	}

	// --- Consultas ---

	public FDSId id() {
		return id;
	}

	public String nomeProdutoQuimico() {
		return nomeProdutoQuimico;
	}

	public Marca marca() {
		return marca;
	}

	public FornecedorId fornecedorId() {
		return fornecedorId;
	}

	public Email emailContacto() {
		return emailContacto;
	}

	public EstadoFDS estado() {
		return estado;
	}

	public DataValidade dataValidade() {
		return dataValidade;
	}

	public Set<PictogramaPerigo> pictogramas() {
		return Collections.unmodifiableSet(pictogramas);
	}

	/**
	 * @return as Obras onde este produto é usado (RF11). Pode estar vazio —
	 * a associação é opcional mesmo fora de {@code RASCUNHO}.
	 */
	public Set<ObraId> obras() {
		return Collections.unmodifiableSet(obras);
	}

	/**
	 * @return a imagem do produto químico, ou {@code null} se ainda não foi
	 * associada.
	 */
	public ImagemProduto imagem() {
		return imagem;
	}

	/**
	 * @return se o produto químico tem dissocianatos (checkbox do protótipo).
	 * {@code false} por omissão.
	 */
	public boolean temDissocianatos() {
		return temDissocianatos;
	}

	/**
	 * Materializa os eventos de domínio pendentes com o instante
	 * {@code agora} e limpa a lista interna — cada evento só é entregue uma
	 * vez. Deve ser chamado pela camada de Application (caso de uso)
	 * imediatamente a seguir a persistir o agregado, para depois os publicar
	 * (ex.: para o subdomínio de Alertas/Auditoria).
	 *
	 * <p><b>Fase 5, Parte 2</b>: até aqui, o timestamp de cada evento era
	 * capturado com {@code Instant.now()} no próprio momento em que a ação de
	 * negócio acontecia dentro do agregado ({@link #criarRascunho}/
	 * {@link #atualizarPara}) — a única chamada a um relógio do sistema em
	 * todo o domínio, inconsistente com a disciplina seguida em todo o resto
	 * do projeto (ex.: {@link DataValidade}, {@code PoliticaValidadeFDS}) de
	 * nunca chamar relógios internamente. Na prática, isso significava que o
	 * timestamp de auditoria de uma transição não refletia necessariamente o
	 * {@code Clock} que o caso de uso injetou para decidir "agora" (visível,
	 * por exemplo, em {@code MarcarFDSObsoletasUseCase}, cujo {@code Clock}
	 * pode ser "congelado" para reprocessamento/teste) — dois relógios
	 * ligeiramente dessincronizados a descrever o mesmo facto de negócio.
	 *
	 * <p>Agora os eventos pendentes são guardados como fábricas
	 * ({@code (Instant, utilizador) -> DomainEvent}) e só materializados
	 * aqui, com o instante e o utilizador que o chamador fornece — o mesmo
	 * instante que já usou para decidir a transição. O agregado continua a
	 * nunca chamar {@code Instant.now()} internamente, tal como as suas
	 * regras de negócio já não chamavam.
	 *
	 * <p><b>Fase 5, Parte 2 (continuação) — "quem alterou" (RF12/RNF03)</b>:
	 * pela mesma razão de não chamar relógios, o agregado também nunca
	 * conhece o utilizador autenticado — é a Application, através do
	 * {@code AutenticacaoPort}, que sabe "quem" e o passa aqui.
	 * {@code utilizador} pode ser {@code null} (ex.: o job agendado de
	 * obsolescência, que não corre em nome de nenhum utilizador humano);
	 * eventos sem campo de utilizador (ex.: {@link FDSCriadaEvent}) ignoram
	 * este valor.
	 *
	 * @param agora o instante a atribuir a cada evento pendente — normalmente
	 * {@code Instant.now(relogioInjetado)} no caso de uso chamador, nunca
	 * {@code Instant.now()} direto.
	 * @param utilizador quem desencadeou a ação, ou {@code null} se não há
	 * nenhum utilizador humano associado à execução atual.
	 */
	public List<DomainEvent> pullDomainEvents(Instant agora, String utilizador) {
		Objects.requireNonNull(agora, "O instante 'agora' é obrigatório para materializar os eventos pendentes.");
		List<DomainEvent> eventos = eventosPendentes.stream().map(fabrica -> fabrica.apply(agora, utilizador)).toList();
		eventosPendentes.clear();
		return eventos;
	}

	// --- Identidade (entidade: igualdade por id, nunca por valor dos campos) ---

	@Override
	public boolean equals(Object o) {
		if (this == o) {
			return true;
		}
		if (!(o instanceof FichaDadosSeguranca outra)) {
			return false;
		}
		return id.equals(outra.id);
	}

	@Override
	public int hashCode() {
		return id.hashCode();
	}
}
