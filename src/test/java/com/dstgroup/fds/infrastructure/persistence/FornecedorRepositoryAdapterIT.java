package com.dstgroup.fds.infrastructure.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.domain.fornecedor.Fornecedor;
import com.dstgroup.fds.domain.fornecedor.NomeFornecedor;
import com.dstgroup.fds.domain.shared.Email;

/**
 * Teste de integração do adapter de Fornecedor, incluindo a ordem preservada
 * dos contactos ({@code @OrderColumn}).
 *
 * <p><b>Nota de honestidade</b>: escrito com cuidado, mas nunca executado —
 * ver {@link FDSRepositoryAdapterIT} para a mesma ressalva.</p>
 */
@Testcontainers
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class FornecedorRepositoryAdapterIT {

	@Container
	static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
			.withDatabaseName("fds")
			.withUsername("fds")
			.withPassword("fds");

	@DynamicPropertySource
	static void propriedadesDaBaseDeDados(DynamicPropertyRegistry registry) {
		registry.add("spring.datasource.url", postgres::getJdbcUrl);
		registry.add("spring.datasource.username", postgres::getUsername);
		registry.add("spring.datasource.password", postgres::getPassword);
	}

	@Autowired
	private FornecedorJpaRepository jpaRepository;

	private FornecedorRepositoryAdapter adapter;

	@BeforeEach
	void setUp() {
		adapter = new FornecedorRepositoryAdapter(jpaRepository);
	}

	@Test
	void deveGuardarERecuperarFornecedorPreservandoOId() {
		Fornecedor fornecedor = Fornecedor.criar(new NomeFornecedor("3M"), new Email("contacto@3m.com"),
				List.of("+351 210 000 000", "+351 210 000 001"));

		adapter.guardar(fornecedor);
		Fornecedor recuperado = adapter.obterPorId(fornecedor.id()).orElseThrow();

		assertThat(recuperado.id()).isEqualTo(fornecedor.id());
		assertThat(recuperado.nome()).isEqualTo(new NomeFornecedor("3M"));
	}

	@Test
	void deveManterAOrdemDosContactos() {
		Fornecedor fornecedor = Fornecedor.criar(new NomeFornecedor("3M"), new Email("contacto@3m.com"),
				List.of("primeiro", "segundo", "terceiro"));

		adapter.guardar(fornecedor);
		Fornecedor recuperado = adapter.obterPorId(fornecedor.id()).orElseThrow();

		assertThat(recuperado.contactos()).containsExactly("primeiro", "segundo", "terceiro");
	}

	@Test
	void deveListarComPaginacao() {
		adapter.guardar(Fornecedor.criar(new NomeFornecedor("3M"), new Email("a@3m.com"), null));
		adapter.guardar(Fornecedor.criar(new NomeFornecedor("A2Brios"), new Email("b@a2brios.pt"), null));

		Pagina<Fornecedor> pagina = adapter.listar(0, 10);

		assertThat(pagina.totalElementos()).isGreaterThanOrEqualTo(2);
	}
}
