package com.dstgroup.fds.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/**
 * Testes de arquitetura (executam em CI como qualquer outro teste): garantem
 * que a regra da dependência do Onion Architecture nunca é violada, mesmo
 * involuntariamente à medida que o projeto cresce.
 *
 * <p>Se este teste falhar, significa que alguém importou uma classe de
 * framework (Spring, JPA) dentro do {@code domain}, ou que o {@code domain}
 * passou a depender de {@code application}/{@code infrastructure} — ambos
 * seriam violações graves da arquitetura definida na especificação técnica.</p>
 */
class OnionArchitectureTest {

	private static final String BASE_PACKAGE = "com.dstgroup.fds";

	private static JavaClasses classes;

	@BeforeAll
	static void importarClasses() {
		classes = new ClassFileImporter()
				.withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
				.importPackages(BASE_PACKAGE);
	}

	@Test
	void dominioNaoDeveDependerDeSpring() {
		ArchRule regra = noClasses()
				.that().resideInAPackage(BASE_PACKAGE + ".domain..")
				.should().dependOnClassesThat().resideInAnyPackage(
						"org.springframework..",
						"jakarta.persistence..",
						"org.hibernate.."
				);
		regra.check(classes);
	}

	@Test
	void dominioNaoDeveDependerDeApplicationOuInfrastructureOuPresentation() {
		ArchRule regra = noClasses()
				.that().resideInAPackage(BASE_PACKAGE + ".domain..")
				.should().dependOnClassesThat().resideInAnyPackage(
						BASE_PACKAGE + ".application..",
						BASE_PACKAGE + ".infrastructure..",
						BASE_PACKAGE + ".presentation.."
				);
		regra.check(classes);
	}

	@Test
	void applicationNaoDeveDependerDeInfrastructureOuPresentation() {
		ArchRule regra = noClasses()
				.that().resideInAPackage(BASE_PACKAGE + ".application..")
				.should().dependOnClassesThat().resideInAnyPackage(
						BASE_PACKAGE + ".infrastructure..",
						BASE_PACKAGE + ".presentation.."
				);
		regra.check(classes);
	}

	/**
	 * Fase 5, Parte 5 — decisão de âmbito: a documentação OpenAPI/Swagger
	 * ({@code @Operation}, {@code @ApiResponse}, {@code @Schema}, etc.) vive
	 * exclusivamente nos controllers (Presentation) e em {@code ErroResponse}
	 * (também Presentation) — nunca nos comandos/respostas da Application.
	 * A mesma razão de fundo já usada para não adotar Bean Validation nos
	 * DTOs na Parte 3: "documentar o contrato HTTP" é vocabulário de
	 * fronteira externa, não da Application. Ao contrário daquela decisão,
	 * esta é verificável automaticamente, por isso ganhou uma regra própria.
	 */
	@Test
	void applicationNaoDeveDependerDeBibliotecasDeDocumentacaoDeApi() {
		ArchRule regra = noClasses()
				.that().resideInAPackage(BASE_PACKAGE + ".application..")
				.should().dependOnClassesThat().resideInAnyPackage(
						"io.swagger.."
				);
		regra.check(classes);
	}
}
