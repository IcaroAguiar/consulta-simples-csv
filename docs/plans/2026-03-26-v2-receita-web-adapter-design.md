# Design: V2 - Adapter Receita Web

## Resumo

Adicionar um novo adapter `receita-web` baseado em automação browser da consulta pública "Consulta Optantes" do portal oficial do Simples Nacional, preservando a arquitetura porta + adapters existente.

**Decisões Confirmadas:**
- Ferramenta de automação: **Playwright**
- Critério de sucesso do spike: **Consulta funcional OU documentação de impedimentos**
- Modo comparativo: **Nice-to-have** (pode ficar para V2.1/V3)
- Configuração de provider: **Arquivo de configuração** (`.env` ou `config.json`)
- Status de erro: **Estender tipo global** com BLOCKED, CAPTCHA_REQUIRED, UNPARSABLE_RESULT

---

## Arquitetura

### Estrutura de Diretórios

```
src/core/simples/
├── simples-lookup.port.ts          # Porta (interface)
├── simples-lookup.types.ts         # Tipos (estendidos)
├── simples-provider.factory.ts     # Factory (estendida)
├── simples-provider.config.ts      # Novo: carrega config de arquivo
└── adapters/
    ├── mock-simples-lookup.adapter.ts
    ├── cnpja-open-simples-lookup.adapter.ts
    └── receita-web/                 # Novo adapter
        ├── index.ts                 # Export público
        ├── receita-consulta-optantes.adapter.ts
        ├── receita-browser.client.ts
        ├── receita-result.parser.ts
        └── receita.selectors.ts
```

### Contrato Atualizado

**`SimplesLookupStatus` estendido:**

```typescript
export type SimplesLookupStatus =
  | "SUCCESS"
  | "INVALID_CNPJ"
  | "NOT_FOUND"
  | "TEMPORARY_ERROR"
  | "PERMANENT_ERROR"
  | "CANCELLED"         // já existe
  | "BLOCKED"           // novo
  | "CAPTCHA_REQUIRED"  // novo
  | "UNPARSABLE_RESULT";// novo
```

**`SimplesProviderName` estendido:**

```typescript
export type SimplesProviderName = "mock" | "cnpja-open" | "receita-web";
```

---

## Fases de Implementação

### Fase1: Spike Técnico

**Objetivo:** Provar viabilidade da automação ou detectar impedimentos.

**Arquivos novos:**
- `src/core/simples/adapters/receita-web/spike.ts`
- `.ai/spike-evidence/` (screenshot + HTML)

**Tarefas:**

| ID | Tarefa |
|----|--------|
| F1-T1 | Instalar Playwright (`pnpm add -D playwright`) |
| F1-T2 | Criar script spike standalone |
| F1-T3 | Navegar paraConsulta Optantes |
| F1-T4 | Preencher campo CNPJ |
| F1-T5 | Capturar resposta HTML |
| F1-T6 | Salvar evidências (screenshot, HTML) |
| F1-T7 | Classificar resultado |
| F1-T8 | Documentar descobertas |

**Critério de Pronto:**
- Spikeexecuta consulta ponta a ponta com CNPJ real
- OU spike detecta claramente CAPTCHA/bloqueio/HTML imprevisível
- Evidências salvas
- Relatório com recomendação

---

### Fase 2: Parser e Classificação

**Objetivo:** Transformar HTML em `SimplesLookupResult`.

**Arquivos novos:**
- `src/core/simples/adapters/receita-web/receita-browser.client.ts`
- `src/core/simples/adapters/receita-web/receita-result.parser.ts`
- `src/core/simples/adapters/receita-web/receita.selectors.ts`

**Tarefas:**

| ID | Tarefa |
|----|--------|
| F2-T1 | Extrair `receita-browser.client.ts` (navegação, preenchimento, submit) |
| F2-T2 | Implementar `receita.selectors.ts` (seletores CSS) |
| F2-T3 | Implementar `receita-result.parser.ts` |
| F2-T4 | Mapear `simplesNacional` |
| F2-T5 | Mapear `simei` |
| F2-T6 | Classificar erros (BLOCKED, CAPTCHA_REQUIRED, TEMPORARY_ERROR) |
| F2-T7 | Tratar UNPARSABLE_RESULT |
| F2-T8 | Testes unitários do parser |

**Critério de Pronto:**
- Parser converte HTML válido em contrato
- Casos de erro mapeados
- Nenhum detalhe de HTML vaza para fora do adapter
- Testes unitários passam

---

### Fase 3: Integração com Provider Selector

**Objetivo:** Plugar adapter no fluxo existente.

**Arquivos novos:**
- `src/core/simples/simples-provider.config.ts`

**Arquivos modificados:**
- `src/core/simples/simples-lookup.types.ts`
- `src/core/simples/simples-provider.factory.ts`

**Tarefas:**

| ID | Tarefa |
|----|--------|
| F3-T1 | Estender `SimplesLookupStatus` |
| F3-T2 | Criar `simples-provider.config.ts` |
| F3-T3 | Atualizar `SimplesProviderName` |
| F3-T4 | Atualizar factory para incluir `receita-web` |
| F3-T5 | Criar `receita-consulta-optantes.adapter.ts` |
| F3-T6 | Criar `index.ts` (export público) |
| F3-T7 | Testes de integração |
| F3-T8 | Atualizar documentação |

**Critério de Pronto:**
- `mock`, `cnpja-open`, `receita-web` funcionam via factory
- Configuração por arquivo funciona
- V1 preservada100% funcional
- Testes de integração passam

---

### Fase 4: Modo Comparativo (Nice-to-have)

**Objetivo:** Comparar resultados entre providers.

**Arquivos novos:**
- `scripts/compare-providers.ts`

**Tarefas:**

| ID | Tarefa |
|----|--------|
| F4-T1 | Criar script comparativo |
| F4-T2 | Consultar com `cnpja-open` |
| F4-T3 | Consultar com `receita-web` |
| F4-T4 | Gerar relatório (concordância, divergência, erros) |
| F4-T5 | Salvar CSV comparativo |

**Status:** Nice-to-have - implementar apenas se houver tempo após Fases 1-3.

---

## Validação

### Por Fase

**Fase 1:**
- Spike executa com 1-3 CNPJs reais
- Evidências salvas
- Resultado documentado

**Fase 2:**
- Testes unitários do parser passam
- Casos de erro mapeados

**Fase 3:**
- `pnpm test` passa
- `pnpm typecheck` passa
- `pnpm build` funciona
- Todos os providers funcionais

**Fase 4:**
- Script comparativo gera relatório

---

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| CAPTCHA na consulta | Alta | Bloqueante | Detectar cedo, documentar |
| Bloqueio de IP | Média | Alto | Tratar como BLOCKED |
| Mudança de HTML | Alta | Médio | Parser tolerante, fixtures |
| Lentidão | Alta | Baixo | Aceitar como característica |
| Seletores quebram | Alta | Médio | Organizar seletores, fallbacks |

### Critérios de Abort

Abortar V2 se:
1. CAPTCHA impeditivo sem contorno
2. Bloqueio estrutural de IP
3. HTML completamente imprevisível

---

## Definição de Pronto

- [ ] Adapter `receita-web` desacoplado
- [ ] Provider selecionável por arquivo de configuração
- [ ] Fluxo CSV funciona com todos os providers
- [ ] Spike funcional ponta a ponta
- [ ] Erros classificados
- [ ] Fonte registrada no output
- [ ] V1 preservada
- [ ] Documentação atualizada

---

## Fora do Escopo

- Backend remoto
- Banco de dados
- Frontend novo
- PDF
- Substituir `cnpja-open` como provider principal

---

## Cronograma Sugerido

**Sprint 1:** Fase1 - Spike técnico
**Sprint 2:** Fase2 - Parser e classificação
**Sprint3:** Fase 3 - Integração
**Sprint4:** Fase 4 - Modo comparativo (se houver tempo)
