# Fluxo de Desenvolvimento

Este documento define o fluxo de desenvolvimento utilizado pela equipe no projeto **MesaFlow**, estabelecendo padrões para branches, commits, integração, releases, hotfixes e colaboração.

O projeto utiliza uma abordagem baseada em **GitFlow**, organizada da seguinte forma:

```text
main
└── Versão estável do projeto

develop
└── Branch de integração

feature/*
└── Desenvolvimento de funcionalidades

release/*
└── Preparação da versão estável

hotfix/*
└── Correção de problemas críticos em produção
```

---

## 1. Estrutura de Branches

### `main`

A branch `main` representa a versão estável do projeto.

* Deve conter apenas versões consideradas estáveis.
* Não deve ser utilizada para desenvolvimento de novas funcionalidades.
* Alterações devem chegar através de uma `release/*` ou de um `hotfix/*`.

### `develop`

A branch `develop` é utilizada para integração das funcionalidades desenvolvidas pela equipe.

* É a base para criação das branches `feature/*`.
* Recebe as funcionalidades após sua conclusão.
* Deve conter a versão atual do desenvolvimento.
* Não deve receber desenvolvimento diretamente.

### `feature/*`

As branches `feature/*` são utilizadas para o desenvolvimento de funcionalidades específicas.

Padrão:

```text
feature/<nome-da-funcionalidade>
```

Exemplos:

```text
feature/login-usuario
feature/cadastro-usuario
feature/dashboard
feature/configuracao-banco
```

As branches devem possuir nomes claros e relacionados à funcionalidade desenvolvida.

### `release/*`

As branches `release/*` são utilizadas **somente após a conclusão das funcionalidades previstas para uma versão na `develop`**.

Padrão:

```text
release/<versao>
```

Exemplo:

```text
release/1.0.0
```

A `release` representa a etapa final de preparação da versão antes de sua integração na `main`.

Durante essa etapa podem ser realizados:

* testes finais;
* correção de bugs;
* ajustes finais;
* revisão de configurações;
* validação da integração entre funcionalidades.

Novas funcionalidades não devem ser adicionadas durante a `release`.

### `hotfix/*`

As branches `hotfix/*` são utilizadas para correções urgentes em versões que já estão na `main`.

Padrão:

```text
hotfix/<descricao-do-problema>
```

Exemplo:

```text
hotfix/corrigir-erro-login
```

Após a correção, o `hotfix` deve atualizar tanto a `main` quanto a `develop`.

---

# 2. Configuração Inicial

Cada integrante deve realizar a configuração do GitFlow localmente.

### Clonar o repositório

```bash
git clone https://github.com/Unisal-Project/MesaFlow.git
cd MesaFlow
```

### Inicializar o GitFlow

```bash
git flow init
```

Durante a configuração, utilizar:

```text
Production branch: main
Development branch: develop
```

A configuração do GitFlow é individual e realizada uma vez em cada máquina.

As branches e o fluxo definido são compartilhados através do repositório remoto.

---

# 3. Desenvolvimento de Features

Antes de iniciar uma nova funcionalidade, a `develop` deve estar atualizada:

```bash
git checkout develop
git pull origin develop
```

Depois, criar a feature utilizando o GitFlow:

```bash
git flow feature start login-usuario
```

Será criada:

```text
feature/login-usuario
```

Todo o desenvolvimento da funcionalidade deve ocorrer nessa branch.

---

# 4. Padrão de Commits

O projeto utiliza uma convenção baseada em **Conventional Commits** para manter o histórico organizado, claro e rastreável.

O formato utilizado é:

```text
tipo(escopo): descrição curta
```

O `tipo` é obrigatório e o `escopo` é opcional.

## Regras

* O tipo deve representar a natureza da alteração.
* O escopo deve identificar a parte do projeto afetada, quando aplicável.
* A descrição deve ser curta e objetiva.
* A descrição deve utilizar o presente/imperativo.
* Não utilizar ponto final na descrição.

## Tipos de Commit

| Tipo       | Utilização                                               |
| ---------- | -------------------------------------------------------- |
| `feat`     | Nova funcionalidade                                      |
| `fix`      | Correção de bug                                          |
| `chore`    | Configurações, infraestrutura, dependências e manutenção |
| `refactor` | Refatoração sem alteração do comportamento               |
| `style`    | Alterações de estilo, layout ou formatação               |
| `perf`     | Melhorias de desempenho                                  |
| `docs`     | Alterações na documentação                               |
| `test`     | Criação ou alteração de testes                           |

## Exemplos

```text
feat(frontend): criar tela de login
feat(api): adicionar endpoint de autenticação
```

```text
fix(api): corrigir validação de usuário
fix(db): corrigir consulta de usuários
```

```text
chore(docker): configurar ambiente de desenvolvimento
```

```text
refactor(api): reorganizar rotas de usuário
```

```text
style(frontend): ajustar layout do formulário
```

```text
perf(db): adicionar índice para consulta de usuários
```

```text
docs: adicionar documentação do GitFlow
```

```text
test(api): adicionar testes de autenticação
```

---

# 5. Processo de Colaboração

Mais de um integrante pode trabalhar na mesma branch `feature/*`.

Exemplo:

```text
             feature/login-usuario
                    ↑
              ┌─────┴─────┐
              │           │
            Dev 1       Dev 2
              │           │
              └─────┬─────┘
                    ↓
                 develop
```

Caso o Dev 1 precise da ajuda do Dev 2, a branch pode ser enviada ao repositório remoto:

```bash
git push -u origin feature/login-usuario
```

O Dev 2 pode acessar a mesma branch:

```bash
git fetch origin
git checkout feature/login-usuario
git pull origin feature/login-usuario
```

Após realizar suas alterações, o Dev 2 deve realizar seus commits normalmente:

```bash
git add .
git commit -m "fix: corrigir validação do login"
git push origin feature/login-usuario
```

O Dev 1 poderá atualizar sua branch:

```bash
git pull origin feature/login-usuario
```

Dessa forma, os integrantes podem colaborar na mesma funcionalidade sem criar branches adicionais desnecessárias.

> Quando houver mais de um desenvolvedor trabalhando na mesma feature, recomenda-se manter a branch atualizada e comunicar alterações que possam afetar o trabalho dos demais integrantes.

---

# 6. Finalização de Features

Após a conclusão e validação da funcionalidade, a feature deve ser finalizada:

```bash
git flow feature finish login-usuario
```

Esse comando realiza o merge da feature na `develop` localmente e remove a branch de feature local.

Depois, enviar a `develop` para o repositório remoto:

```bash
git push origin develop
```

A branch da feature também deve ser removida do repositório remoto:

```bash
git push origin --delete feature/login-usuario
```

As branches `feature/*` são temporárias e devem ser removidas após sua integração.

---

# 7. Processo de Integração

O fluxo principal do projeto é:

```text
feature/*
    ↓
develop
    ↓
release/*
    ↓
main
```

O processo segue as seguintes etapas:

1. Atualizar a `develop`.
2. Criar uma `feature/*`.
3. Desenvolver a funcionalidade.
4. Realizar os commits.
5. Colaborar na feature, caso necessário.
6. Validar a funcionalidade.
7. Finalizar a feature.
8. Integrar na `develop`.
9. Continuar o desenvolvimento das demais funcionalidades.
10. Quando todas as funcionalidades da versão estiverem concluídas, iniciar uma `release/*`.
11. Realizar testes e ajustes finais.
12. Integrar a release na `main`.

---

# 8. Processo de Release

A `release/*` **não faz parte do desenvolvimento diário**.

Ela deve ser criada somente quando **todas as funcionalidades planejadas para a versão estiverem concluídas e integradas na `develop`**.

Exemplo:

```text
feature/login ────────┐
feature/dashboard ────┤
feature/usuarios ─────┼──→ develop
feature/api ──────────┘
                           ↓
                 Funcionalidades concluídas
                           ↓
                     release/1.0.0
```

Para iniciar uma release:

```bash
git checkout develop
git pull origin develop

git flow release start 1.0.0
```

Durante a release, o foco passa a ser a preparação da versão estável.

Podem ser realizados:

* testes finais;
* correção de bugs;
* pequenos ajustes;
* revisão de configurações;
* validação de integração;
* correções necessárias para estabilização da versão.

**Novas funcionalidades não devem ser adicionadas durante a release.**

Após a validação:

```bash
git flow release finish 1.0.0
```

Enviar as alterações para o repositório remoto:

```bash
git push origin main
git push origin develop
git push origin --tags
```

O fluxo final será:

```text
develop
    ↓
release/1.0.0
    ↓
Testes + correções + ajustes
    ↓
main
```

A `main` passa então a representar a nova versão estável.

---

# 9. Processo de Hotfix

O `hotfix` deve ser utilizado quando um **problema crítico for encontrado em uma versão que já está na `main`** e precise ser corrigido rapidamente.

Nesse cenário, não é necessário esperar o próximo ciclo de desenvolvimento.

Primeiro, atualizar a `main`:

```bash
git checkout main
git pull origin main
```

Criar o hotfix:

```bash
git flow hotfix start corrigir-erro-login
```

Realizar a correção e os commits normalmente:

```bash
git add .
git commit -m "fix(auth): corrigir erro crítico no login"
```

Após testar e validar a correção:

```bash
git flow hotfix finish corrigir-erro-login
```

Enviar as alterações:

```bash
git push origin main
git push origin develop
git push origin --tags
```

O fluxo será:

```text
                 Problema crítico
                       ↓
                      main
                       ↓
          hotfix/corrigir-erro-login
                       ↓
                 Correção + testes
                       ↓
                ┌──────┴──────┐
                ↓             ↓
              main         develop
```

Dessa forma, a versão estável é corrigida rapidamente e a mesma correção é incorporada ao desenvolvimento da próxima versão.

---

# 10. Atualização das Branches

Antes de iniciar uma nova feature, sempre atualizar a `develop`:

```bash
git checkout develop
git pull origin develop
```

Durante o trabalho colaborativo, manter a branch de feature atualizada:

```bash
git pull origin feature/nome-da-feature
```

Isso ajuda a reduzir conflitos e evita trabalhar com código desatualizado.

---

# 11. Regras de Colaboração

Para manter o projeto organizado, todos os integrantes devem seguir estas regras:

* Não desenvolver diretamente na `main`.
* Não desenvolver diretamente na `develop`.
* Criar uma `feature/*` para cada funcionalidade.
* Utilizar nomes claros para as branches.
* Seguir o padrão definido para os commits.
* Atualizar a `develop` antes de iniciar uma nova feature.
* Permitir que outros integrantes trabalhem na mesma feature quando necessário.
* Resolver conflitos antes da integração.
* Validar a funcionalidade antes de finalizar a feature.
* Remover branches `feature/*` após sua integração.
* Criar `release/*` somente quando as funcionalidades da versão estiverem concluídas.
* Utilizar `release/*` apenas para testes, correções e ajustes finais.
* Não adicionar novas funcionalidades durante uma release.
* Utilizar `hotfix/*` para problemas críticos encontrados na `main`.
* Manter a `main` sempre estável.

---

# 12. Resumo do Fluxo

### Desenvolvimento

```text
feature/*
    ↓
Desenvolvimento
    ↓
Validação
    ↓
feature finish
    ↓
develop
```

### Finalização do projeto/versão

```text
develop
    ↓
Todas as funcionalidades concluídas
    ↓
release/*
    ↓
Testes finais
Correção de bugs
Ajustes finais
    ↓
main
```

### Problema crítico na versão estável

```text
main
    ↓
hotfix/*
    ↓
Correção + testes
    ↓
main + develop
```

### Fluxo completo

```text
                         INÍCIO
                           │
                           ▼
                    ┌──────────────┐
                    │   develop    │
                    │  integração  │
                    └──────┬───────┘
                           │
                     feature start
                           │
                           ▼
              ┌─────────────────────────┐
              │       feature/*         │
              │                         │
              │  feature/login          │
              │  feature/dashboard      │
              └───────────┬─────────────┘
                          │
                    desenvolvimento
                    e colaboração
                          │
                    feature finish
                          │
                          ▼
                    ┌──────────────┐
                    │   develop    │
                    └──────┬───────┘
                           │
             Todas as funcionalidades
                 da versão concluídas?
                       │
                       ▼
                    release/*
                       │
              ┌────────┴────────┐
              │                 │
        Testes finais      Correções e
                           ajustes finais
              │                 │
              └────────┬────────┘
                       │
                 versão validada
                       │
                       ▼
                 ┌──────────────┐
                 │     main     │
                 │    estável   │
                 └──────┬───────┘
                        │
                  Bug crítico?
                    │       │
                   NÃO     SIM
                    │       │
                    │       ▼
                    │   ┌───────────┐
                    │   │ hotfix/*  │
                    │   └─────┬─────┘
                    │         │
                    │    correção/testes
                    │         │
                    │    ┌────┴────┐
                    │    ▼         ▼
                    │   main    develop
                    │
                    ▼
                   FIM

Este fluxo tem como objetivo manter o desenvolvimento organizado, facilitar a colaboração entre os integrantes, preservar a estabilidade da `main` e permitir que problemas críticos sejam corrigidos rapidamente quando necessário.
