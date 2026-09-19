package com.dstgroup.fds.infrastructure.persistence;

import static org.assertj.core.api.Assertions.assertThat;

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

import com.dstgroup.fds.domain.obra.CentroProdutivo;
import com.dstgroup.fds.domain.obra.Obra;

/**
 * <p><b>Nota de honestidade</b>: escrito com cuidado, mas nunca executado —
 * ver {@link FDSRepositoryAdapterIT} para a mesma ressalva.</p>
 */
@Testcontainers
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class CentroProdutivoEObraRepositoryAdapterIT {

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
	private CentroProdutivoJpaRepository centroJpaRepository;

	@Autowired
	private ObraJpaRepository obraJpaRepository;

	private CentroProdutivoRepositoryAdapter centroAdapter;
	private ObraRepositoryAdapter obraAdapter;

	@BeforeEach
	void setUp() {
		centroAdapter = new CentroProdutivoRepositoryAdapter(centroJpaRepository);
		obraAdapter = new ObraRepositoryAdapter(obraJpaRepository);
	}

	@Test
	void deveGuardarERecuperarCentroProdutivoPreservandoOId() {
		CentroProdutivo centro = CentroProdutivo.criar("Fábrica Norte", "Braga");

		centroAdapter.guardar(centro);
		CentroProdutivo recuperado = centroAdapter.obterPorId(centro.id()).orElseThrow();

		assertThat(recuperado.id()).isEqualTo(centro.id());
		assertThat(recuperado.localizacao()).isEqualTo("Braga");
	}

	@Test
	void deveGuardarERecuperarObraComReferenciaAoCentroProdutivo() {
		CentroProdutivo centro = CentroProdutivo.criar("Fábrica Norte", "Braga");
		centroAdapter.guardar(centro);
		Obra obra = Obra.criar("Estaleiro Ponte Norte", centro.id());

		obraAdapter.guardar(obra);
		Obra recuperada = obraAdapter.obterPorId(obra.id()).orElseThrow();

		assertThat(recuperada.centroProdutivoId()).isEqualTo(centro.id());
	}
}
