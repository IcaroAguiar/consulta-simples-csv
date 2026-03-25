# Consulta Simples CSV

Aplicativo desktop para processar arquivos CSV com CNPJs, consultar enquadramento no Simples Nacional e no SIMEI e devolver um CSV enriquecido, pronto para operação e conferência.

O projeto foi desenhado para funcionar localmente, com baixo atrito para o usuário final e arquitetura preparada para trocar o provider no futuro sem reescrever o fluxo principal.

## O que ele faz

- lê um CSV com header
- detecta ou aceita configuração da coluna de CNPJ
- normaliza e valida os documentos
- remove consultas duplicadas na mesma execução
- consulta `mock` ou `cnpja-open`
- exporta um novo CSV com colunas de resultado
- mostra progresso, ETA, auto-save e resumo operacional

## Para quem é

Este projeto é útil para equipes que precisam validar rapidamente listas de empresas a partir de planilhas, sem depender de banco de dados, backend remoto ou uma interface web complexa.

## Principais características

- App desktop em `Electron`, pensado para usuários não técnicos
- Arquitetura `porta + adapters`
- Provider `mock` para testes offline
- Provider `cnpja-open` para validação real do fluxo
- Deduplicação por execução
- Rate limit compatível com a API pública do CNPJá
- Cancelamento seguro com salvamento parcial
- Pipeline GitHub Actions para gerar `.exe` unsigned

## Como funciona

1. O usuário escolhe um CSV local.
2. O app encontra a coluna de CNPJ ou usa a coluna informada manualmente.
3. CNPJs válidos e únicos são consultados no provider configurado.
4. O resultado é reaplicado nas linhas originais.
5. O CSV final é salvo automaticamente ao lado do arquivo de entrada.

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

### `cnpja-open`

Integração com a API pública do CNPJá para validar o fluxo real.

Observações importantes:

- a API pública tem limite baixo por IP
- a consulta em lote é funcional, mas não rápida
- este provider deve ser tratado como provider inicial de validação, não como provider final de produção

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

Build Windows local:

```bash
pnpm dist:win
```

Build Windows via GitHub Actions:

- workflow: `Windows EXE unsigned`
- gera artefatos `.exe`, `.yml` e `.blockmap`

## Testes e validação

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

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
- execução longa com progresso e ETA
- geração de `.exe` unsigned para usuário teste

Próximos passos naturais:

- assinatura de código no Windows
- smoke visual automatizado do Electron
- suporte a providers pagos com maior throughput
