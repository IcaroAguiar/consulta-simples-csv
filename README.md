# Fiscal Desk

Aplicativo desktop para processar planilhas com CNPJs, consultar enquadramento no Simples Nacional e no SIMEI e devolver uma entrega enriquecida em CSV ou XLSX, pronta para operação e conferência.

O projeto foi desenhado para funcionar localmente, com baixo atrito para o usuário final e arquitetura preparada para trocar o provider no futuro sem reescrever o fluxo principal.

O mapa da documentação fica em [`docs/README.md`](docs/README.md). Contexto
público do produto, decisões de escopo e regras de publicação ficam em
[`docs/project-context.md`](docs/project-context.md). O arquivo `CONTEXT.md` da
raiz, quando existir localmente, é rascunho privado ignorado pelo Git.

## O que ele faz

- lê um CSV com header
- lê um XLSX simples com header
- detecta ou aceita configuração da coluna de CNPJ
- normaliza e valida os documentos
- remove consultas duplicadas na mesma execução
- consulta `mock`, `base-publica-local`, `cnpja-open` ou `receita-web`
- exporta CSV ou XLSX com colunas de resultado
- mostra progresso, ETA, auto-save e resumo operacional

## Para quem é

Este projeto é útil para equipes que precisam validar rapidamente listas de empresas a partir de planilhas, sem depender de banco de dados, backend remoto ou uma interface web complexa.

## Principais características

- App desktop em `Electron`, pensado para usuários não técnicos
- Arquitetura `porta + adapters`
- Provider `mock` para testes offline
- Provider `base-publica-local` para operação local consentida sem rede
- Provider `cnpja-open` para validação real do fluxo
- Deduplicação por execução
- Rate limit compatível com a API pública do CNPJá
- Cancelamento seguro com salvamento parcial
- Pipeline GitHub Actions para gerar instaladores unsigned de Windows e macOS

## Como funciona

1. O usuário escolhe um CSV ou XLSX local.
2. O app encontra a coluna de CNPJ ou usa a coluna informada manualmente.
3. CNPJs válidos e únicos são consultados no provider configurado.
4. O resultado é reaplicado nas linhas originais.
5. O resultado final é salvo automaticamente ao lado do arquivo de entrada.

## Colunas adicionadas no output

- `linha`
- `cnpj_original`
- `cnpj_normalizado`
- `cnpj_valido`
- `simples_nacional`
- `simei`
- `status`
- `fonte`
- `mensagem`

## Providers

### `mock`

Modo ideal para validar interface, fluxo, exportação e testes locais sem rede.

### `base-publica-local`

Modo local-first para preparar uma base pública local com consentimento explícito
e consultar sem depender de rede durante a execução.

É o caminho recomendado para volume depois que a base estiver preparada neste
computador. O app pode buscar a fonte oficial, baixar o `Simples.zip` mensal da
Receita Federal com retomada de download e preparar um índice local em
streaming. Esse caminho evita exigir o pacote público completo de dezenas de GB.
O preparo manual por CSV continua disponível para bases já tratadas pelo
usuário.

### `cnpja-open`

Integração com a API pública do CNPJá para validar o fluxo real.

Observações importantes:

- a API pública tem limite baixo por IP
- a consulta do arquivo em lote é funcional, mas a chamada online efetiva fica
  serial nesta release
- este provider deve ser tratado como provider inicial de validação, não como provider final de produção

### `receita-web`

Automação assistida do portal oficial da Receita para a Consulta Optantes.

Observações importantes:

- é uma funcionalidade experimental
- abre navegador visível e exige supervisão humana
- pode ser bloqueada pela proteção anti-robô do portal
- na release Windows, tenta usar Chrome ou Edge instalados e, se não encontrar, cai para o Chromium empacotado no app
- não deve ser usado como motor padrão de volume; paralelismo com múltiplas
  janelas, se existir, deve ser modo experimental com limite, cancelamento e
  parada em CAPTCHA/bloqueio

## Velocidade e controle

O app informa a estratégia de velocidade do provider selecionado e permite
escolher o perfil de execução `leve`, `equilibrado`, `rápido` ou `máximo`:

- `base-publica-local`: volume local rápido quando preparada; o perfil controla
  a concorrência local
- `cnpja-open`: online moderado, sujeito a rate limit; o perfil não abre
  paralelismo oculto
- `receita-web`: assistido lento, indicado para amostras ou divergências; segue
  sem paralelismo na release atual
- `receita-web-parallel-experimental`: modo avançado com aceite explícito,
  até 3 janelas visíveis, parada em CAPTCHA/bloqueio e sem promessa de sucesso
  em lote
- `mock`: simulação rápida para validar fluxo, sem dado real

Durante a execução, `Pausar` solicita uma parada cooperativa com checkpoint para
retomada pelo histórico. `Cancelar` interrompe a execução. Para Base local, a
tela permite buscar a fonte oficial e baixar/preparar o `Simples.zip` antes de
consultar grandes volumes sem rede durante a execução.

## Comparativo assistido

Para conferir um CSV já processado contra a Receita Web em modo assistido:

```bash
pnpm compare:receita-web <csv-processado> [saida.csv] [--mode sample|errors|all] [--limit 10]
```

O padrão é `--mode sample --limit 10`, adequado para validação amostral. Use
`--errors` para reconsultar todas as linhas com status de erro, ou combine com
`--limit` quando quiser limitar essa conferência. Use `--all` apenas quando o
usuário aceitar o tempo, a supervisão e o risco de CAPTCHA. O relatório gerado
preserva lado a lado o resultado original e a reconsulta, classificando
`concordante`, `divergente` ou `inconclusivo`; ele não escolhe vencedor oculto.

Este comando ainda não substitui a tela principal do Electron nem preenche a aba
`Divergencias` do XLSX de saída. Receita Web continua experimental, abre
navegador visível e pode exigir desbloqueio humano de CAPTCHA.

## Stack

- `Electron`
- `TypeScript`
- `pnpm`
- `Vitest`
- `csv-parse`
- `csv-stringify`

## Executando localmente no macOS

```bash
pnpm install
pnpm dev
```

Para abrir o app já compilado:

```bash
pnpm build
pnpm start
```

## Gerando builds

Build local de validação no macOS:

```bash
pnpm dist:mac
```

Build Windows local `x64`:

```bash
pnpm dist:win
```

Esse build agora prepara também um Chromium Windows dedicado para ser empacotado como fallback do provider `receita-web`.

Build Windows local `arm64`:

```bash
pnpm dist:win:arm64
```

Build unsigned via GitHub Actions:

- workflow: `Desktop unsigned builds`
- Windows x64: gera instalador `.exe` unsigned via `pnpm dist:win`
- macOS: gera `.dmg` unsigned via `pnpm dist:mac`
- o workflow apenas sobe artifacts internos; não publica GitHub Release, não
  assina, não notariza e não habilita updater real
- quando a solicitação for nova versão/build para usuários, esses artifacts
  precisam ser promovidos para GitHub Release assets; links de Actions não
  encerram a publicação

## Testes e validação

```bash
pnpm test
pnpm test:coverage
pnpm test:e2e
pnpm lint
pnpm typecheck
pnpm build
```

`pnpm test:e2e` agrega a validação determinística local-first:

- contratos unitários/integrados com coverage;
- smoke CSV real com `mock`;
- smoke CSV real com `base-publica-local`;
- app Electron real com entrada CSV e XLSX;
- app Electron real com `mock` e `base-publica-local`;
- retomada, histórico, checkpoint e auto-save XLSX;
- smoke visual responsivo.

Ficam fora do e2e determinístico: Receita Web live/massiva, `cnpja-open` live,
publish, assinatura, notarização, updater real, envio de diagnóstico e
telemetria.

## Troubleshooting

Se o Electron reclamar que falhou a instalação, rode:

```bash
pnpm repair:electron
pnpm build
pnpm start
```

Com `pnpm`, o problema normalmente não é apagar `node_modules/electron`, e sim refazer o `postinstall` do Electron e do `esbuild`.

## Estado do projeto

O app já está preparado para:

- uso interno com processamento real de CSV
- entrada XLSX simples com header
- execução longa com progresso e ETA
- geração de instaladores unsigned para Windows e macOS

Próximos passos naturais:

- assinatura de código no Windows
- assinatura/notarização no macOS
- suporte a providers pagos com maior throughput
