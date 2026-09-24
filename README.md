# fds-backend

> Este repositório contém também, em [`limpeza/`](limpeza/README.md), a plataforma de gestão operacional e financeira para uma empresa de limpeza (diretor + operadores/chefes de carrinha).

Backend da Plataforma de Gestão de Produtos Químicos (dstgroup chemicals) — **Fase 0** do plano de implementação (ver `especificacao-tecnica.md`).

## O que esta Fase 0 entrega

- Esqueleto do projeto Spring Boot organizado segundo **Onion Architecture**:
  `domain/`, `application/`, `infrastructure/`, `presentation/`.
- **Segurança**: backend configurado como *OAuth2 Resource Server*, validando
  JWT emitidos pelo Keycloak (sem gestão própria de sessões/passwords). Roles
  do realm (`fds-admin`, `fds-gestor`, `fds-operador`) são mapeados para
  `GrantedAuthority` do Spring Security via `KeycloakRealmRoleConverter`.
- **Base de dados**: PostgreSQL + Flyway (migração `V1__init.sql` baseline).
- **Guarda de arquitetura**: teste ArchUnit (`OnionArchitectureTest`) que
  falha o build se o `domain` passar a depender de Spring/JPA ou das outras
  camadas — corre em CI como qualquer outro teste.
- `docker-compose.yml` com PostgreSQL + Keycloak (realm `fds` pré-importado,
  com clients e utilizadores de desenvolvimento).

Ainda **não** inclui lógica de negócio (agregado `FichaDadosSeguranca`, casos
de uso, etc.) — isso é a Fase 1.

## Como correr localmente

1. Subir a infraestrutura de apoio:

   ```bash
   docker compose up -d
   ```

   Isto arranca:
   - PostgreSQL em `localhost:5432` (db `fds`, user/pass `fds`/`fds`)
   - Keycloak em `http://localhost:8081` (admin: `admin`/`admin`), com o
     realm `fds` já importado (clients `fds-frontend` e `fds-backend`,
     utilizadores de teste `gestor.dev`/`gestor123` e `admin.dev`/`admin123`)

2. Correr a aplicação:

   ```bash
   ./gradlew bootRun
   ```

   > **Nota**: este projeto usa o Gradle Wrapper. Se o `gradlew`/`gradlew.bat`
   > não estiverem presentes no teu clone, gera-os uma vez com
   > `gradle wrapper --gradle-version 8.10` (precisas de ter o Gradle
   > instalado localmente só para este passo único).

3. Obter um token de acesso do Keycloak (fluxo *Resource Owner Password* só
   para teste manual em dev — o frontend React usará Authorization Code +
   PKCE):

   ```bash
   curl -X POST http://localhost:8081/realms/fds/protocol/openid-connect/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "client_id=fds-frontend" \
     -d "grant_type=password" \
     -d "username=gestor.dev" \
     -d "password=gestor123"
   ```

4. Chamar o endpoint protegido com o token obtido:

   ```bash
   curl http://localhost:8080/api/status/me \
     -H "Authorization: Bearer <access_token>"
   ```

   Sem token (ou token inválido) deve responder `401 Unauthorized`.

## Correr os testes

```bash
./gradlew test
```

Inclui:
- `OnionArchitectureTest` — regras de dependência (ArchUnit).
- `FdsBackendApplicationTests` — arranque do contexto Spring com PostgreSQL
  real via **Testcontainers** (não precisa do `docker-compose` a correr; o
  Testcontainers gere o seu próprio container efémero). O `JwtDecoder` é
  substituído por uma chave local de teste (`TestSecurityConfig`), pelo que
  este teste **não** depende de um Keycloak real nem de rede.

## ⚠️ Nota sobre este esqueleto

Este código foi escrito à mão, seguindo a especificação técnica, mas **não
foi compilado/testado neste ambiente** — o sandbox onde foi gerado não tem
acesso de rede ao Maven Central (só a alguns registries como npm/PyPI/GitHub),
pelo que não foi possível descarregar as dependências Spring Boot para correr
`./gradlew build` aqui. Antes de continuares para a Fase 1, corre localmente:

```bash
./gradlew build
```

e corrige qualquer erro de compilação/nome de método que possa ter escapado
(APIs do Spring Security/Boot mudam ligeiramente entre versões menores).

## Próximo passo — Fase 1

Implementar o agregado `FichaDadosSeguranca` e os Value Objects em
`domain/fds/`, começando pelos testes (TDD), seguidos dos casos de uso em
`application/usecase/` e do adapter de persistência em
`infrastructure/persistence/`. Ver secção "Fase 1" de `especificacao-tecnica.md`.
