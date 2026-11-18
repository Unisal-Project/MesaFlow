# Diagnóstico de rede do build de desenvolvimento

Investigação local em 17/11/2026. Os tempos abaixo são medições dessa sessão,
não requisitos de rede do projeto.

## Evidências

O projeto tem um único `package.json` e `package-lock.json` na raiz, sem npm
workspaces. Frontend e backend executam `npm ci` sobre as mesmas dependências.
O lockfile v3 contém 454 URLs, todas em `registry.npmjs.org`. Não foram
encontrados arquivos `.npmrc` no projeto, no usuário ou em `/etc/npmrc`.
No container, registry é HTTPS e proxy/https-proxy são `null`.

A máquina tinha duas rotas padrão IPv4:

- USB `enp0s20f0u5c4i2`: métrica 100, MTU da rota 1422.
- Wi-Fi `wlp0s20f3`: métrica 600, gateway `192.168.170.1`.

A bridge Docker tem MTU 1500. A métrica menor faz a conexão USB ser preferida.
Os nomes das interfaces são apenas evidência local, não configuração do projeto.

Comparação no próprio host, mantendo URL, IPv4 e verificação TLS:

| Tarball | Rota padrão USB | Wi-Fi explícito |
| --- | --- | --- |
| TypeScript 6.0.2 (4.515.770 bytes) | Timeout em 25 s, 466.872 bytes recebidos | Completo em 1,60 s |
| TypeScript 6.0.3, versão do lockfile (4.515.854 bytes) | Downloads lentos observados no npm | Completo em 2,50 s |
| Prisma 7.10.1 (14.172.358 bytes) | Timeout em 15 s, 778.168 bytes recebidos | Completo em 2,41 s |

Também houve timeout de download em containers descartáveis com rede bridge e
host. A resolução DNS retornou endereços IPv4 e IPv6; uma transferência IPv6
no host recebeu HTTP 200, mas expirou em 10 s após apenas 166.618 bytes.
Forçar IPv4 não eliminou a lentidão.

Um teste Node foi interrompido explicitamente após 30 s e emitiu ECONNRESET
ao destruir a requisição. Esse reset foi provocado pelo diagnóstico e **não**
reproduz, por si só, o reset espontâneo originalmente relatado.

## Interpretação

Há degradação de transferência no caminho da conexão USB preferida pelo host,
independente do Docker. `npm ping` comprova acesso a uma resposta pequena;
não testa a transferência completa de tarballs grandes e concorrentes.
A comparação com Wi-Fi demonstra uma alternativa saudável para essas URLs.
Ainda não distingue perda de pacotes, limitação da conexão/operadora, problemas
de MTU/PMTUD ou equipamento intermediário nesse caminho.

`build.network: host` não corrige a rota externa usada pelo host e também
apresentou lentidão. Por isso, foi removido após o diagnóstico. O backend
voltou de `npm ci --verbose` para `npm ci`. Essas alterações desfazem os
experimentos locais encontrados no início da investigação.

Não há justificativa para alterar DNS global, desativar SSL, aumentar timeouts,
atualizar dependências, remover lockfile ou mudar Alpine com base nesses dados.
Mensagens verbose sobre dependências opcionais de outras plataformas são
esperadas. Não foi demonstrada falha de compilação nativa ou de Prisma Engines.
Os `.dockerignore` dos subdiretórios não controlam estes builds: o contexto é a
raiz e o arquivo efetivo é `.dockerignore` na raiz.

## Correção local indicada e reprodução

Priorizar a conexão saudável no gerenciador de rede local e repetir os builds
com a rede padrão do Docker. Qualquer alteração da conexão da máquina deve
ser autorizada; não há alteração de rota ou MTU embutida no Compose.

Para comparar caminhos sem alterar as rotas, usar o mesmo tarball e trocar
`INTERFACE_WIFI` pelo nome local da interface:

```bash
ip route
curl -4 --max-time 25 -o /dev/null \
  -w 'status=%{http_code} bytes=%{size_download} time=%{time_total}\n' \
  https://registry.npmjs.org/prisma/-/prisma-7.10.1.tgz
curl -4 --interface INTERFACE_WIFI --max-time 25 -o /dev/null \
  -w 'status=%{http_code} bytes=%{size_download} time=%{time_total}\n' \
  https://registry.npmjs.org/prisma/-/prisma-7.10.1.tgz
docker compose --progress plain build backend
docker compose --progress plain build frontend
docker compose up -d
docker compose ps
docker compose logs --tail 50 backend frontend
curl --fail http://localhost:3333/api/v1/health
curl --fail -o /dev/null http://localhost:5173/
```

Produção, testes de integração, dependências e volumes não devem ser alterados
para corrigir o acesso à internet desta máquina.

## Resultado da sessão

- Build do backend com `network: host` e `npm ci --verbose`: interrompido
  manualmente após mais de nove minutos sem conclusão. Houve downloads de
  tarballs levando mais de seis minutos. Não houve erro espontâneo final
  disponível para identificar a URL exata do ECONNRESET originalmente relatado.
- Build do frontend com a rede padrão: também permaneceu em `npm ci` e foi
  interrompido manualmente. Log salvo em `/tmp/mesaflow-frontend-build.log`
  (temporário, fora do repositório).
- Os dois builds foram executados sem cache npm reutilizado de instalações
  anteriores na etapa observada; o verbose do backend indicou `cache miss`.
- `docker compose up -d`: concluído usando as imagens anteriores. O serviço
  `database-init` terminou com sucesso. Não se trata de validação de imagens novas.
- `docker compose ps`: frontend e backend ativos; MariaDB e Valkey saudáveis.
- Logs consultados: backend escutando em `0.0.0.0:3333`, Vite pronto em 5173;
  nenhuma mensagem nova nos logs dos serviços após a subida.
- `GET http://localhost:3333/api/v1/health`: HTTP 200, `{"status":"ok"}`.
- `GET http://localhost:5173/`: HTTP 200.
- `git diff --check`: passou. Nenhuma alteração em lockfile, dependências,
  produção, testes de integração ou regras de negócio. Nenhum volume removido.

A priorização temporária do Wi-Fi foi solicitada ao usuário e ainda não foi
autorizada nesta sessão. Não foi aplicada alteração na rede do host. Faltam
os builds completos e a validação das imagens resultantes pela conexão saudável.
Não se deve considerar o problema resolvido apenas porque as imagens antigas
continuam funcionando.

Referências: [rede host do Docker](https://docs.docker.com/engine/network/drivers/host/)
e [configurações do npm 10](https://docs.npmjs.com/cli/v10/using-npm/config/).
