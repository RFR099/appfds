plugins {
	java
	id("org.springframework.boot") version "3.3.4"
	id("io.spring.dependency-management") version "1.1.6"
}

group = "com.dstgroup"
version = "0.1.0-SNAPSHOT"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(21)
	}
}

configurations {
	compileOnly {
		extendsFrom(configurations.annotationProcessor.get())
	}
}

repositories {
	mavenCentral()
}

extra["testcontainersVersion"] = "1.20.1"
extra["archunitVersion"] = "1.3.0"

dependencies {
	// Web / API
	implementation("org.springframework.boot:spring-boot-starter-web")
	implementation("org.springframework.boot:spring-boot-starter-validation")

	// Persistência
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	runtimeOnly("org.postgresql:postgresql")
	implementation("org.flywaydb:flyway-core")
	implementation("org.flywaydb:flyway-database-postgresql")

	// Segurança / SSO (Keycloak via OAuth2 Resource Server)
	implementation("org.springframework.boot:spring-boot-starter-oauth2-resource-server")
	implementation("org.springframework.boot:spring-boot-starter-security")

	// Observabilidade
	implementation("org.springframework.boot:spring-boot-starter-actuator")

	// Documentação da API (Fase 5, Parte 5) — gera o OpenAPI 3 a partir das
	// anotações dos controllers e serve o Swagger UI em /swagger-ui.html.
	// Versão não verificável neste sandbox (sem acesso ao Maven Central) —
	// 2.6.0 é, tanto quanto me lembro, compatível com Spring Boot 3.3.x;
	// convém confirmar a versão mais recente compatível ao correr isto pela
	// primeira vez num ambiente com acesso real ao Maven Central.
	implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.6.0")

	// Notificações (Ticket -> Fornecedor, RF07)
	implementation("org.springframework.boot:spring-boot-starter-mail")

	// Lombok (opcional, reduz boilerplate nos adapters/DTOs — nunca no domínio)
	compileOnly("org.projectlombok:lombok")
	annotationProcessor("org.projectlombok:lombok")

	// Testes
	testImplementation("org.springframework.boot:spring-boot-starter-test")
	testImplementation("org.springframework.security:spring-security-test")
	testImplementation("com.tngtech.archunit:archunit-junit5:${property("archunitVersion")}")
	testImplementation("org.testcontainers:junit-jupiter:${property("testcontainersVersion")}")
	testImplementation("org.testcontainers:postgresql:${property("testcontainersVersion")}")
	testImplementation(platform("org.testcontainers:testcontainers-bom:${property("testcontainersVersion")}"))
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
	useJUnitPlatform()
	testLogging {
		exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
		showCauses = true
		showExceptions = true
		showStackTraces = true
	}
}
