# AGENTS.md

Guia operacional para agentes trabalhando neste repositório.

## Idioma e postura

- Responda ao usuário em português-BR.
- Seja direto, factual e pragmático.
- Antes de editar, leia a superfície tocada e preserve alterações não relacionadas do usuário.
- Mudanças devem ser pequenas, revisáveis e acompanhadas de evidência de validação.

## Produto

Este repositório contém o **Consulta Simples CSV**, app desktop Electron que está evoluindo para a marca **Fiscal Desk**.

O produto processa planilhas locais com CNPJs, consulta enquadramento no Simples Nacional/SIMEI por provedores explícitos e gera uma entrega operacional em CSV ou XLSX. A promessa central é local-first, privacidade por padrão, baixo atrito para usuários não técnicos e execução honesta sobre limites de fonte, velocidade e bloqueios.

Não transforme este projeto em backend remoto, banco, SaaS, plataforma fiscal genérica, OCR, PDF, telemetria, licenciamento ou updater real sem pedido explícito.

## Documentos de referência

- `README.md`: visão pública, comandos e funcionamento atual.
- `docs/README.md`: mapa da documentação versionada.
- `docs/project-context.md`: contexto público durável do produto, arquitetura, provedores e decisões de escopo.
- `docs/qa/first-release-validation.md`: matriz de validação para release e PRs materiais.
- `docs/plans/`: planos técnicos versionados ainda relevantes.
- `CONTEXT.md`: nota local privada ignorada pelo Git. Não trate como fonte pública nem versione seu conteúdo sem curadoria.
- `docs/fiscal-desk/` e `docs/adr/`: material local de workstream/decisão ignorado por padrão. Não force-add. Se algo dessas pastas precisar ser público, publique uma versão curada em documento versionado apropriado.

## Arquitetura

- Preserve a arquitetura `porta + adapters`.
- O domínio e os casos de uso ficam em `src/core`.
- O processo Electron, preload, IPC e integração com sistema operacional ficam em `src/main`.
- A interface fica em `src/renderer`.
- Regras específicas de provider pertencem a `src/core/simples/adapters`.
- Nenhum módulo fora de `src/core/simples/adapters` deve conhecer detalhes internos de Receita Web, CNPJá, Base Pública Local ou mock.
- Contratos, nomes de provider, catálogo, configuração, saúde e fallback devem continuar centralizados em `src/core/simples/*`.
- Mantenha a UI mínima, operacional e honesta. Evite hero, dashboard decorativo, copy promocional e controles que prometam automação além do que o runtime prova.

## Provedores

- `mock` deve continuar funcional como provider offline padrão para desenvolvimento, testes e smokes determinísticos.
- `base-publica-local` é o caminho recomendado para volume local após preparo explícito e consentido da base.
- `cnpja-open` valida fluxo real online, mas depende de rede, disponibilidade e rate limit.
- `receita-web` é assistido e experimental: navegador visível, supervisão humana, risco de CAPTCHA/bloqueio e sem promessa de automação robusta em lote.
- Na release Windows, Receita Web depende de Chrome ou Edge instalados; fallback empacotado só deve ser tratado como melhor esforço.

## Segurança e privacidade

- Não exponha, versione, logue ou cole segredos, tokens, cookies, chaves, credenciais, dados fiscais privados, CNPJs reais de cliente ou nomes de empresas extraídos de bases reais.
- Use fixtures sintéticas para testes, docs e smokes versionados.
- `.ai/`, `.claude/`, `.lazyweb/`, `.visual-fidelity/`, outputs de QA, screenshots, artifacts, reports gerados e notas operacionais locais não devem ser versionados.
- Relatórios de segredo devem mostrar caminhos, variáveis, contagens e risco, nunca valores.
- Qualquer publicação de docs locais grandes exige curadoria: remover histórico de agente, receipts obsoletos, dados sensíveis, duplicação, imagens/artefatos pesados e decisões superadas.

## Comandos úteis

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
pnpm smoke:real-csv
pnpm smoke:electron-ui
pnpm smoke:visual
pnpm test:e2e
```

Builds locais:

```bash
pnpm dist:mac
pnpm dist:win
pnpm dist:win:arm64
```

Comparativo assistido Receita Web:

```bash
pnpm compare:receita-web <csv-processado> [saida.csv] [--mode sample|errors|all] [--limit 10]
```

## Validação esperada

- Docs-only: rode `git diff --check` e confira links/paths alterados.
- Código core/provider/export/ingestão: `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm smoke:real-csv`.
- IPC, preload, Electron, execução ou entrega: inclua `pnpm smoke:electron-ui`.
- UI, copy visível ou layout: inclua `pnpm smoke:visual`.
- Mudança ampla ou release: use `pnpm test:e2e` e a matriz de `docs/qa/first-release-validation.md`.
- Se um check não rodar, diga exatamente o motivo e o risco residual.

## Release e remoto

- O workflow `Desktop unsigned builds` gera artifacts Windows/macOS, mas não cria GitHub Release, não assina, não notariza e não habilita updater real.
- Neste repo, quando o usuário pedir nova versão, novo build, build para usuários, release ou atualização distribuível, `assets` significa os GitHub Release assets da versão/tag correspondente.
- Uma solicitação de nova versão/build só está concluída quando os binários gerados e verificados estiverem anexados aos GitHub Release assets. Artifacts de GitHub Actions são evidência intermediária, não disponibilidade para usuários.
- Se não for possível publicar ou atualizar os GitHub Release assets, reporte o bloqueio explicitamente e não declare a versão/build como disponibilizada.
- Publicar release, criar tag, disparar workflow ou limpar assets remotos são efeitos externos; faça apenas quando o usuário pedir ou confirmar.
- Antes de push/release, revise o diff atual, verifique arquivos ignorados e evite publicar contexto local ou artifacts gerados.

## Quando estiver em dúvida

1. Leia `README.md`, `docs/README.md`, `docs/project-context.md` e a superfície de código tocada.
2. Confirme se a mudança preserva `mock`, provider boundaries e fluxo local-first.
3. Prefira o menor patch que resolva o pedido.
4. Valide no caminho real afetado ou registre o bloqueio com evidência.
