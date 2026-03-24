# Consulta Simples CSV

Aplicativo desktop para enriquecer um CSV com o status de enquadramento no Simples Nacional e no SIMEI a partir de CNPJs.

## Stack

- Electron
- TypeScript
- pnpm
- Vitest
- csv-parse / csv-stringify

## Rodando no macOS

```bash
pnpm install
pnpm dev
```

## Build local

```bash
pnpm dist:mac
```

## Build Windows

```bash
pnpm dist:win
```

## Troubleshooting

Se o Electron reclamar que falhou a instalação, rode:

```bash
pnpm repair:electron
pnpm build
pnpm start
```

Com `pnpm`, o problema normalmente não é apagar `node_modules/electron`, e sim refazer o `postinstall` do Electron e do `esbuild`.

## Fluxo GSD local

Este repositório nasce compatível com GSD, mas a pasta `.ai/` é operacional/local e fica fora do Git.

Se você tiver o `gsd_lite` instalado no ambiente, atualize o contexto assim:

```bash
python3 -m gsd_lite.cli prepare --runtime codex --repo "$PWD" --task "<objetivo da tarefa>"
```

Neste ambiente, o módulo `gsd_lite` não estava disponível no Python no momento do bootstrap inicial, então a estrutura foi preparada manualmente.
