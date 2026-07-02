# Release publication

Este documento define o corte seguro para publicar builds unsigned do Fiscal Desk
em GitHub Release sem contas Apple Developer, sem certificado Windows, sem plano
pago do GitHub e sem updater real.

## Escopo

Permitido neste corte:

- usar branch protection em `main`, porque o repositório é público;
- gerar artifacts unsigned pelo workflow `Desktop unsigned builds`;
- verificar artifacts por workflow manual;
- gerar `release-manifest.json` e `SHA256SUMS.txt`;
- criar GitHub Release manualmente depois da verificação.

Fora deste corte:

- assinatura Windows;
- assinatura ou notarização macOS;
- updater automático;
- publicação automática de Release;
- deleção remota de tags, releases, assets ou workflow runs;
- uso de secrets/certificados.

## Regra obrigatória de assets

Quando o owner solicitar nova versão, novo build, build para usuários, release
ou atualização distribuível, a entrega só termina depois que os binários
gerados e verificados estiverem anexados como GitHub Release assets da
versão/tag correspondente.

Artifacts de GitHub Actions não contam como distribuição para usuários. Eles são
apenas evidência intermediária para verificação e promoção. Se a publicação ou
atualização dos GitHub Release assets estiver bloqueada, o bloqueio deve ser
reportado explicitamente e a versão/build não deve ser descrita como
disponibilizada.

## Branch protection recomendada

Configure em GitHub UI para `main`:

- exigir pull request antes de merge;
- exigir status check `PR Quality Gate / quality-gate`;
- exigir branch atualizada antes de merge;
- bloquear force push;
- bloquear deleção;
- exigir resolução de conversas;
- exigir histórico linear se o modo de merge do repositório suportar squash ou
  rebase;
- opcional: exigir commits assinados apenas se isso não quebrar o fluxo atual de
  colaboração.

Isso é uma configuração remota do repositório. Não deve ser alterada por agente
sem confirmação explícita do owner.

## Fluxo de release unsigned

1. Garantir que `main` está limpo e no SHA que será publicado.
2. Rodar o quality gate de PR ou validar que o SHA já passou pelo workflow
   `PR Quality Gate`.
3. Rodar `Desktop unsigned builds` por `workflow_dispatch` ou por tag `v*`.
4. Esperar os artifacts:
   - `fiscal-desk-windows-x64`: instalador `.exe`, metadata `.yml` e
     `.blockmap`;
   - `fiscal-desk-macos`: `.dmg`, `.zip`, metadata `.yml` e `.blockmap`.
5. Rodar `Release artifact verification` por `workflow_dispatch` informando:
   - `build_run_id`: run ID do workflow `Desktop unsigned builds`;
   - `target_sha`: SHA exato do commit;
   - `version`: versão de `package.json`, sem prefixo `v`;
   - `tag`: tag esperada, por exemplo `v0.1.2`.
6. Baixar o artifact `release-verification-<version>`.
7. Conferir `release-manifest.json` e `SHA256SUMS.txt`.
8. Criar GitHub Release manualmente como draft.
9. Anexar os artifacts unsigned, `release-manifest.json` e `SHA256SUMS.txt`.
10. Publicar a Release apenas depois de conferir que a nota deixa explícito:
    unsigned, not notarized, no auto-updater.

## Contrato do manifesto

O manifesto precisa ser gerado por:

```bash
pnpm release:manifest -- \
  --input-dir release-artifacts \
  --output-dir release-verification \
  --expected-sha <sha> \
  --expected-version <versao> \
  --artifact-run-id <run-id> \
  --tag <tag>
```

O script falha se:

- a versão esperada não bater com `package.json`;
- o SHA esperado não bater com o checkout atual;
- faltar `.exe`, metadata `.yml`/`.yaml` ou `.blockmap` em
  `fiscal-desk-windows-x64`;
- faltar `.dmg`, `.zip`, metadata `.yml`/`.yaml` ou `.blockmap` em
  `fiscal-desk-macos`.

O workflow falha antes de baixar artifacts se o `build_run_id` informado não
estiver `completed/success` ou se o `head_sha` da run não bater exatamente com
`target_sha`.

O manifesto sempre declara:

- `signed: false`;
- `notarized: false`;
- `autoUpdater: false`;
- `publishPerformed: false`.

Esse contrato evita trocar assets sem receipt, mas não substitui assinatura de
código nem notarização.

## Permissões de workflow

`Release artifact verification` usa somente:

```yaml
permissions:
  actions: read
  contents: read
```

Ele baixa artifacts de outra run, gera hashes e publica apenas um artifact de
verificação. O workflow não cria tag, não cria Release, não edita Release e não
usa secrets.

## Evidência mínima antes de publicar

- SHA de `main` ou da tag conferido.
- `PR Quality Gate` verde para o SHA.
- `Desktop unsigned builds` verde.
- `Release artifact verification` verde.
- `release-manifest.json` anexado na Release.
- `SHA256SUMS.txt` anexado na Release.
- Release notes citando explicitamente que os builds são unsigned e não
  notarized.

## Referências GitHub

- Branch protection: <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches>
- Workflow dispatch e permissões: <https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax>
- Workflow artifacts: <https://docs.github.com/en/actions/tutorials/store-and-share-data>
