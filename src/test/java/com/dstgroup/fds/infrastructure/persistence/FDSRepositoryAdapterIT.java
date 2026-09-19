package com.dstgroup.fds.infrastructure.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

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

import com.dstgroup.fds.application.dto.FiltroFDS;
import com.dstgroup.fds.application.dto.Pagina;
import com.dstgroup.fds.domain.fds.DataValidade;
import com.dstgroup.fds.domain.fds.EstadoFDS;
import com.dstgroup.fds.domain.fds.FichaDadosSeguranca;
import com.dstgroup.fds.domain.fds.Marca;
import com.dstgroup.fds.domain.fds.PictogramaPerigo;
import com.dstgroup.fds.domain.fornecedor.FornecedorId;
import com.dstgroup.fds.domain.obra.CentroProdutivoId;
import com.dstgroup.fds.domain.obra.ObraId;
import com.dstgroup.fds.domain.shared.Email;

/**
 * Testes de integração: mapeamento domínio &lt;-&gt; JPA e queries derivadas
 * contra um PostgreSQL real (Testcontainers), incluindo a migração Flyway.
 *
 * <p><b>Nota de honestidade</b>: escrito com cuidado, mas nunca executado —
 * este sandbox não tem acesso ao Maven Central para descarregar Spring
 * Boot/Testcontainers/PostgreSQL driver. Corre {@code ./gradlew test} num
 * ambiente com esse acesso antes de confiar cegamente nele.</p>
 */
@Testcontainers
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class FDSRepositoryAdapterIT {

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
	private FDSJpaRepository jpaRepository;

	@Autowired
	private ObraJpaRepository obraJpaRepository;

	@Autowired
	private CentroProdutivoJpaRepository centroProdutivoJpaRepository;

	@Autowired
	private FornecedorJpaRepository fornecedorJpaRepository;

	private FDSRepositoryAdapter adapter;

	@BeforeEach
	void setUp() {
		adapter = new FDSRepositoryAdapter(jpaRepository);
	}

	// o fornecedor tem de existir de facto — fds.fornecedor_id tem FK para
	// fornecedor.id (ver V3__create_fornecedor_table.sql)
	private FornecedorId criarFornecedorPersistido() {
		FornecedorJpaEntity entidade = fornecedorJpaRepository.save(
				new FornecedorJpaEntity(UUID.randomUUID(), "Fornecedor de Teste", "fornecedor@teste.pt", List.of()));
		return new FornecedorId(entidade.getId());
	}

	@Test
	void deveGuardarERecuperarFDSDaBaseDeDados() {
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("SprayMount", new Marca("3M"),
				criarFornecedorPersistido(), new Email("f@3m.com"),
				new DataValidade(LocalDate.of(2026, 1, 1), LocalDate.of(2027, 1, 1)),
				EnumSet.of(PictogramaPerigo.CORROSIVOS), null);

		adapter.guardar(fds);
		FichaDadosSeguranca recuperada = adapter.obterPorId(fds.id()).orElseThrow();

		assertThat(recuperada.nomeProdutoQuimico()).isEqualTo("SprayMount");
		assertThat(recuperada.marca()).isEqualTo(new Marca("3M"));
		assertThat(recuperada.pictogramas()).containsExactly(PictogramaPerigo.CORROSIVOS);
	}

	@Test
	void deveDetetarDuplicadoNaBaseDeDados() {
		FornecedorId fornecedorId = criarFornecedorPersistido();
		FichaDadosSeguranca fds = FichaDadosSeguranca.criarRascunho("SOLIM D-SAN", new Marca("A2Brios"),
				fornecedorId, null, null, null, null);
		adapter.guardar(fds);

		boolean existeDuplicado = adapter.existeDuplicado("SOLIM D-SAN", new Marca("A2Brios"), fornecedorId);
		boolean naoExisteParaOutroFornecedor = adapter.existeDuplicado("SOLIM D-SAN", new Marca("A2Brios"),
				criarFornecedorPersistido());

		assertThat(existeDuplicado).isTrue();
		assertThat(naoExisteParaOutroFornecedor).isFalse();
	}

	@Test
	void deveListarComPaginacao() {
		adapter.guardar(FichaDadosSeguranca.criarRascunho("Produto A", new Marca("3M"), null, null, null, null, null));
		adapter.guardar(FichaDadosSeguranca.criarRascunho("Produto B", new Marca("3M"), null, null, null, null, null));

		Pagina<FichaDadosSeguranca> pagina = adapter.listar(FiltroFDS.vazio(), 0, 10);

		assertThat(pagina.totalElementos()).isGreaterThanOrEqualTo(2);
		assertThat(pagina.conteudo()).isNotEmpty();
	}

	@Test
	void deveFiltrarPorNomeComoSubstringCaseInsensitive() {
		adapter.guardar(FichaDadosSeguranca.criarRascunho("SprayMount Adhesive", new Marca("3M"), null, null, null, null, null));
		adapter.guardar(FichaDadosSeguranca.criarRascunho("SOLIM D-SAN", new Marca("A2Brios"), null, null, null, null, null));

		Pagina<FichaDadosSeguranca> pagina = adapter.listar(
				new FiltroFDS(null, "spraymount", null, null, null, null), 0, 10);

		assertThat(pagina.conteudo()).extracting(FichaDadosSeguranca::nomeProdutoQuimico)
				.containsExactly("SprayMount Adhesive");
	}

	@Test
	void deveFiltrarPorMarca() {
		adapter.guardar(FichaDadosSeguranca.criarRascunho("Produto 3M", new Marca("3M"), null, null, null, null, null));
		adapter.guardar(FichaDadosSeguranca.criarRascunho("Produto A2Brios", new Marca("A2Brios"), null, null, null, null, null));

		Pagina<FichaDadosSeguranca> pagina = adapter.listar(
				new FiltroFDS(null, null, null, null, "3m", null), 0, 10);

		assertThat(pagina.conteudo()).extracting(FichaDadosSeguranca::nomeProdutoQuimico)
				.containsExactly("Produto 3M");
	}

	@Test
	void deveFiltrarPorFornecedor() {
		FornecedorId fornecedorA = criarFornecedorPersistido();
		adapter.guardar(FichaDadosSeguranca.criarRascunho("Produto do Fornecedor A", new Marca("3M"),
				fornecedorA, null, null, null, null));
		adapter.guardar(FichaDadosSeguranca.criarRascunho("Produto de Outro Fornecedor", new Marca("3M"),
				criarFornecedorPersistido(), null, null, null, null));

		Pagina<FichaDadosSeguranca> pagina = adapter.listar(
				new FiltroFDS(null, null, fornecedorA, null, null, null), 0, 10);

		assertThat(pagina.conteudo()).extracting(FichaDadosSeguranca::nomeProdutoQuimico)
				.containsExactly("Produto do Fornecedor A");
	}

	@Test
	void deveFiltrarPorEstado() {
		FichaDadosSeguranca completa = FichaDadosSeguranca.criarRascunho("Produto Completo", new Marca("3M"),
				criarFornecedorPersistido(), new Email("f@3m.com"),
				new DataValidade(LocalDate.of(2026, 1, 1), LocalDate.of(2027, 1, 1)),
				EnumSet.of(PictogramaPerigo.CORROSIVOS), null);
		completa.atualizarPara(EstadoFDS.ATUALIZADA);
		adapter.guardar(completa);
		adapter.guardar(FichaDadosSeguranca.criarRascunho("Produto Rascunho", new Marca("3M"), null, null, null, null, null));

		Pagina<FichaDadosSeguranca> pagina = adapter.listar(
				new FiltroFDS(null, null, null, null, null, EstadoFDS.RASCUNHO), 0, 10);

		assertThat(pagina.conteudo()).extracting(FichaDadosSeguranca::nomeProdutoQuimico)
				.contains("Produto Rascunho")
				.doesNotContain("Produto Completo");
	}

	@Test
	void deveFiltrarPorObraAssociada() {
		// as obras têm de existir de facto — fds_obras.obra_id tem FK para obra.id
		CentroProdutivoJpaEntity centro = centroProdutivoJpaRepository.save(
				new CentroProdutivoJpaEntity(UUID.randomUUID(), "Centro Teste", null));
		ObraJpaEntity obraAEntity = obraJpaRepository.save(
				new ObraJpaEntity(UUID.randomUUID(), "Obra A", centro.getId()));
		ObraJpaEntity obraBEntity = obraJpaRepository.save(
				new ObraJpaEntity(UUID.randomUUID(), "Obra B", centro.getId()));
		ObraId obraA = new ObraId(obraAEntity.getId());
		ObraId obraB = new ObraId(obraBEntity.getId());

		adapter.guardar(FichaDadosSeguranca.criarRascunho("Usado na Obra A", new Marca("3M"),
				null, null, null, null, Set.of(obraA)));
		adapter.guardar(FichaDadosSeguranca.criarRascunho("Usado na Obra B", new Marca("3M"),
				null, null, null, null, Set.of(obraB)));

		Pagina<FichaDadosSeguranca> pagina = adapter.listar(
				new FiltroFDS(null, null, null, obraA, null, null), 0, 10);

		assertThat(pagina.conteudo()).extracting(FichaDadosSeguranca::nomeProdutoQuimico)
				.containsExactly("Usado na Obra A");
	}

	@Test
	void deveFiltrarPorCentroProdutivoAtravesDaObraAssociada() {
		// não há coluna centro_produtivo_id na FDS — o filtro resolve-se via
		// subquery FDS -> fds_obras -> obra -> centro_produtivo (ver FDSSpecifications)
		CentroProdutivoJpaEntity centroNorte = centroProdutivoJpaRepository.save(
				new CentroProdutivoJpaEntity(UUID.randomUUID(), "Fábrica Norte", "Braga"));
		CentroProdutivoJpaEntity centroSul = centroProdutivoJpaRepository.save(
				new CentroProdutivoJpaEntity(UUID.randomUUID(), "Fábrica Sul", "Faro"));
		ObraJpaEntity obraNorte = obraJpaRepository.save(
				new ObraJpaEntity(UUID.randomUUID(), "Estaleiro Norte", centroNorte.getId()));
		ObraJpaEntity obraSul = obraJpaRepository.save(
				new ObraJpaEntity(UUID.randomUUID(), "Estaleiro Sul", centroSul.getId()));

		adapter.guardar(FichaDadosSeguranca.criarRascunho("Produto do Norte", new Marca("3M"),
				null, null, null, null, Set.of(new ObraId(obraNorte.getId()))));
		adapter.guardar(FichaDadosSeguranca.criarRascunho("Produto do Sul", new Marca("3M"),
				null, null, null, null, Set.of(new ObraId(obraSul.getId()))));

		Pagina<FichaDadosSeguranca> pagina = adapter.listar(
				new FiltroFDS(new CentroProdutivoId(centroNorte.getId()), null, null, null, null, null), 0, 10);

		assertThat(pagina.conteudo()).extracting(FichaDadosSeguranca::nomeProdutoQuimico)
				.containsExactly("Produto do Norte");
	}

	@Test
	void deveCombinarMultiplosFiltros() {
		adapter.guardar(FichaDadosSeguranca.criarRascunho("Produto 3M Norte", new Marca("3M"), null, null, null, null, null));
		adapter.guardar(FichaDadosSeguranca.criarRascunho("Produto 3M Sul", new Marca("3M"), null, null, null, null, null));

		Pagina<FichaDadosSeguranca> pagina = adapter.listar(
				new FiltroFDS(null, "norte", null, null, "3m", null), 0, 10);

		assertThat(pagina.conteudo()).extracting(FichaDadosSeguranca::nomeProdutoQuimico)
				.containsExactly("Produto 3M Norte");
	}
}
