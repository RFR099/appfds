package com.dstgroup.fds.domain.fornecedor;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

import com.dstgroup.fds.domain.shared.Email;

/**
 * Agregado raiz do bounded context de suporte "Gestão de Fornecedores".
 *
 * <p>Muito mais simples que {@code FichaDadosSeguranca}: não tem máquina de
 * estados nem conceito de rascunho — nome e e-mail principal são sempre
 * obrigatórios desde a criação, o que é suficiente para o caso de uso
 * "Adicionar Fornecedor" inline no formulário de FDS (RF05).</p>
 *
 * <p><b>Identidade</b>: {@link FornecedorId}. Ao criar um fornecedor novo
 * ({@link #criar}) é sempre gerado internamente. A única exceção é
 * {@link #reidratar}, usado pela Infrastructure para reconstituir um
 * fornecedor já existente com o id real persistido. Igualdade por
 * identidade, não por valor — dois fornecedores com o mesmo nome e e-mail
 * são entidades distintas.</p>
 */
public final class Fornecedor {

	private final FornecedorId id;
	private NomeFornecedor nome;
	private Email emailPrincipal;
	private final List<String> contactos;

	private Fornecedor(FornecedorId id, NomeFornecedor nome, Email emailPrincipal, List<String> contactos) {
		this.id = Objects.requireNonNull(id, "O id do fornecedor não pode ser nulo.");
		this.nome = Objects.requireNonNull(nome, "O nome do fornecedor é obrigatório.");
		this.emailPrincipal = Objects.requireNonNull(emailPrincipal, "O e-mail principal é obrigatório.");
		this.contactos = contactos == null ? new ArrayList<>() : new ArrayList<>(contactos);
	}

	public static Fornecedor criar(NomeFornecedor nome, Email emailPrincipal, List<String> contactos) {
		return new Fornecedor(FornecedorId.gerar(), nome, emailPrincipal, contactos);
	}

	/**
	 * Reconstitui um fornecedor já existente a partir de dados persistidos —
	 * uso exclusivo do adapter de persistência (Infrastructure). Preserva o
	 * {@code id} real, ao contrário de {@link #criar}.
	 */
	public static Fornecedor reidratar(FornecedorId id, NomeFornecedor nome, Email emailPrincipal,
			List<String> contactos) {
		return new Fornecedor(id, nome, emailPrincipal, contactos);
	}

	public void adicionarContacto(String contacto) {
		if (contacto == null || contacto.isBlank()) {
			throw new ContactoFornecedorInvalidoException();
		}
		this.contactos.add(contacto.trim());
	}

	// --- Consultas ---

	public FornecedorId id() {
		return id;
	}

	public NomeFornecedor nome() {
		return nome;
	}

	public Email emailPrincipal() {
		return emailPrincipal;
	}

	public List<String> contactos() {
		return Collections.unmodifiableList(contactos);
	}

	// --- Identidade ---

	@Override
	public boolean equals(Object o) {
		if (this == o) {
			return true;
		}
		if (!(o instanceof Fornecedor outro)) {
			return false;
		}
		return id.equals(outro.id);
	}

	@Override
	public int hashCode() {
		return id.hashCode();
	}
}
