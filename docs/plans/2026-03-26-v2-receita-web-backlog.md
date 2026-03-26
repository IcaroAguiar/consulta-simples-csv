# Backlog: V2 - Adapter Receita Web

## Visão Geral

| Fase | Nome | Prioridade | Dependências |
|------|------|------------|--------------|
| Fase 1 | Spike Técnico | Alta | Nenhuma |
| Fase 2 | Parser e Classificação | Alta | Fase 1 |
| Fase 3 | Integração com Selector | Alta | Fase 2 |
| Fase 4 | Modo Comparativo | Baixa | Fase 3 |

---

## Fase1: Spike Técnico

### Épico: Provar viabilidade da automação

**Objetivo:** Validar que a consulta pública pode ser automatizada, ou documentar impedimentos técnicos.

**Critério de Aceite:**
- Spike executa consulta ponta a ponta com CNPJ real
- OU spike detecta claramente CAPTCHA/bloqueio/HTML imprevisível
- Evidências (screenshot + HTML) salvas em `.ai/spike-evidence/`
- Relatório documenta: viabilidade, limitações, recomendação

---

### Tarefas

#### F1-T1: Instalar Playwright
**Prioridade:** Alta | **Estimativa:** 15min | **Dependências:** Nenhuma

**Descrição:**
Adicionar Playwright como dependência de desenvolvimento.

**Critérios de Aceite:**
- [ ] `pnpm add -D playwright` executado
- [ ] Browsers instalados (`pnpm exec playwright install`)
- [ ] Package.json atualizado

**Notas Técnicas:**
- Playwright será devDependency
- Considerar instalar apenas chromium para reduzir footprint

---

#### F1-T2: Criar diretório do adapter
**Prioridade:** Alta | **Estimativa:** 5min | **Dependências:**F1-T1

**Descrição:**
Criar estrutura de diretórios para o novo adapter.

**Critérios de Aceite:**
- [ ] Diretório `src/core/simples/adapters/receita-web/` criado
- [ ] Arquivo placeholder `spike.ts` criado

---

#### F1-T3: Identificar URLdo serviço
**Prioridade:** Alta | **Estimativa:** 30min | **Dependências:** F1-T2

**Descrição:**
Navegar manualmente no portal do Simples Nacional para identificar a URL correta do serviço "Consulta Optantes".

**Critérios de Aceite:**
- [ ] URL do formulário identificada
- [ ] URL de submit identificada (se diferente)
- [ ] Documentado em`.ai/spike-evidence/urls.md`

**Riscos:**
- Portal pode requerer navegação multi-página
- URLs podem ter tokens dinâmicos

---

#### F1-T4: Implementar spike de navegação
**Prioridade:** Alta | **Estimativa:** 1h | **Dependências:** F1-T3

**Descrição:**
Criar script standalone que abre o navegador, navega até o formulário e captura a página.

**Critérios de Aceite:**
- [ ] Script abre navegador (Chromium)
- [ ] Navega até Consulta Optantes
- [ ] Aguarda carregamento completo
- [ ] Screenshot salvo

**Código base:**
```typescript
// src/core/simples/adapters/receita-web/spike.ts
import { chromium } from 'playwright';

async function spike() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  // ...
}
```

---

#### F1-T5: Preencher campo CNPJ
**Prioridade:** Alta | **Estimativa:** 45min | **Dependências:** F1-T4

**Descrição:**
Localizar input do CNPJ e preencher com CNPJ de teste.

**Critérios de Aceite:**
- [ ] Input localizado via seletor CSS
- [ ] CNPJ preenchido corretamente
- [ ] Formulário submetido
- [ ] Screenshotdo preenchimento salvo

**Riscos:**
- Input pode ter validação JavaScript
- Pode haverCAPTCHA visível

---

#### F1-T6: Capturar resposta
**Prioridade:** Alta | **Estimativa:** 1h | **Dependências:** F1-T5

**Descrição:**
Aguardar resposta e extrair HTML bruto.

**Critérios de Aceite:**
- [ ] Aguarda resposta (timeout configurável)
- [ ] HTML extraído
- [ ] Screenshot da resposta salvo

**Riscos:**
- Resposta pode ser AJAX
- Pode haver loading intermitente

---

#### F1-T7: Classificar resultado do spike
**Prioridade:** Alta | **Estimativa:** 30min | **Dependências:** F1-T6

**Descrição:**
Analisar resultado e classificar em: SUCCESS, BLOCKED, CAPTCHA_REQUIRED, ou UNPARSABLE_RESULT.

**Critérios de Aceite:**
- [ ] Resultado classificado
- [ ] Justificativa documentada
- [ ] Recomendação: continuar ou abortar

---

#### F1-T8: Documentar descobertas
**Prioridade:** Média | **Estimativa:** 30min | **Dependências:** F1-T7

**Descrição:**
Criar relatório técnico com descobertas do spike.

**Critérios de Aceite:**
- [ ] Relatório em `.ai/spike-evidence/report.md`
- [ ] Inclui: URLs, seletores, timeouts, erros encontrados
- [ ] Recomendação final

---

## Fase 2: Parser e Classificação

### Épico: Transformar HTML em contrato

**Objetivo:** Implementar parser que converte HTML da Receita em `SimplesLookupResult`.

**Critério de Aceite:**
- Parser converte HTML válido em contrato
- Casos de erro mapeados
- Nenhum detalhe de HTML vaza para fora do adapter
- Testes unitários passam

---

### Tarefas

#### F2-T1: Implementar receita-browser.client.ts
**Prioridade:** Alta | **Estimativa:** 2h | **Dependências:** Fase 1 concluída

**Descrição:**
Extrair lógica de navegação do spike para client reutilizável.

**Critérios de Aceite:**
- [ ] Classe `ReceitaBrowserClient` criada
- [ ] Métodos: `navigate()`, `fillCnpj()`, `submit()`, `waitResult()`
- [ ] Timeout configurável
- [ ] AbortSignal suportado

---

#### F2-T2: Implementar receita.selectors.ts
**Prioridade:** Alta | **Estimativa:** 1h | **Dependências:** F2-T1

**Descrição:**
Centralizar seletores CSS para campos e resultados.

**Critérios de Aceite:**
- [ ] Seletores para input CNPJ
- [ ] Seletores para botão submit
- [ ] Seletores para resultado Simples Nacional
- [ ] Seletores para resultado SIMEI
- [ ] Seletores para mensagens de erro

---

#### F2-T3: Implementar receita-result.parser.ts
**Prioridade:** Alta | **Estimativa:** 2h | **Dependências:** F2-T2

**Descrição:**
Converter HTML bruto em `SimplesLookupResult`.

**Critérios de Aceite:**
- [ ] Função `parseReceitaResult(html, cnpj)` implementada
- [ ] Retorna `SimplesLookupResult` padronizado
- [ ] Campo `source` sempre = "receita-web"

---

#### F2-T4: Mapear simplesNacional
**Prioridade:** Alta | **Estimativa:** 30min | **Dependências:** F2-T3

**Descrição:**
Extrair status do Simples Nacional do HTML.

**Critérios de Aceite:**
- [ ] Detecta "Optante" vs "Não Optante"
- [ ] Valores: `true`, `false`, ou `null` (indeterminado)

---

#### F2-T5: Mapearsimei
**Prioridade:** Alta | **Estimativa:** 30min | **Dependências:** F2-T3

**Descrição:**
Extrair status do SIMEI do HTML.

**Critérios de Aceite:**
- [ ] Detecta "Optante" vs "Não Optante"
- [ ] Valores: `true`, `false`, ou `null` (indeterminado)

---

#### F2-T6: Classificar erros
**Prioridade:** Alta | **Estimativa:** 1h | **Dependências:** F2-T3

**Descrição:**
Mapear casos de erro para status corretos.

**Critérios de Aceite:**
- [ ] CAPTCHA detectado → `CAPTCHA_REQUIRED`
- [ ] Bloqueio de IP → `BLOCKED`
- [ ] Timeout/conexão → `TEMPORARY_ERROR`
- [ ] CNPJ inválido → `INVALID_CNPJ` (se detectável)

---

#### F2-T7: Tratar UNPARSABLE_RESULT
**Prioridade:** Alta | **Estimativa:** 30min | **Dependências:** F2-T6

**Descrição:]
Tratar HTML que não corresponde ao formato esperado.

**Critérios de Aceite:**
- [ ] Quando HTML não reconhecido, retorna `{ status: "UNPARSABLE_RESULT", raw: html }`
- [ ] Log de warning para investigação

---

#### F2-T8: Testes unitários do parser
**Prioridade:** Alta | **Estimativa:** 2h | **Dependências:** F2-T7

**Descrição:**
Criar testes unitários com fixtures HTML.

**Critérios de Aceite:**
- [ ] Teste com HTML de sucesso
- [ ] Teste com HTML de CAPTCHA
- [ ] Teste com HTML de bloqueio
- [ ] Teste com HTML imprevisível
- [ ] `pnpm test` passa

---

## Fase 3: Integração com Provider Selector

### Épico: Plugar adapter no fluxo existente

**Objetivo:** Permitir seleção de `receita-web` por arquivo de configuração.

**Critério de Aceite:**
- `mock`, `cnpja-open`, `receita-web` funcionam via factory
- Configuração por arquivo funciona
- V1 preservada100% funcional
- Testes de integração passam

---

### Tarefas

#### F3-T1: Estender SimplesLookupStatus
**Prioridade:** Alta | **Estimativa:** 15min | **Dependências:** Fase 2 concluída

**Descrição:**
Adicionar novos status ao tipo.

**Critérios de Aceite:**
- [ ] `BLOCKED` adicionado
- [ ] `CAPTCHA_REQUIRED` adicionado
- [ ] `UNPARSABLE_RESULT` adicionado
- [ ] Typecheck passa

---

#### F3-T2: Criar simples-provider.config.ts
**Prioridade:** Alta | **Estimativa:** 45min | **Dependências:** F3-T1

**Descrição:**
Implementar carregamento de configuração de provider.

**Critérios de Aceite:**
- [ ] Lê de `simples-provider.config.json`
- [ ] Fallback para variável de ambiente `SIMPLES_PROVIDER`
- [ ] Fallback padrão para `mock`
- [ ] Valida provider válido

---

#### F3-T3: Atualizar SimplesProviderName
**Prioridade:** Alta | **Estimativa:** 5min | **Dependências:** F3-T2

**Descrição:**
Adicionar `receita-web` ao tipo.

**Critérios de Aceite:**
- [ ] Tipo atualizado
- [ ] Typecheck passa

---

#### F3-T4: Atualizar factory
**Prioridade:** Alta | **Estimativa:** 30min | **Dependências:** F3-T3

**Descrição:**
Adicionar case para `receita-web` na factory.

**Critérios de Aceite:**
- [ ] Factory suporta `receita-web`
- [ ] Instancia `ReceitaConsultaOptantesAdapter`

---

#### F3-T5: Implementar ReceitaConsultaOptantesAdapter
**Prioridade:** Alta | **Estimativa:** 1.5h | **Dependências:** F3-T4

**Descrição:**
Criar adapter principal que usa browser client + parser.

**Critérios de Aceite:**
- [ ] Implementa `SimplesLookupPort`
- [ ] Usa `ReceitaBrowserClient` para navegação
- [ ] Usa `parseReceitaResult` para parsing
- [ ] Gerencia lifecycle do browser

---

#### F3-T6: Criar index.ts (export)
**Prioridade:** Baixa | **Estimativa:** 5min | **Dependências:** F3-T5

**Descrição:**
Export público do adapter.

**Critérios de Aceite:**
- [ ] Exporta `ReceitaConsultaOptantesAdapter`
- [ ] Exporta tipos públicos se necessário

---

#### F3-T7: Testes de integração
**Prioridade:** Alta | **Estimativa:** 1.5h | **Dependências:** F3-T6

**Descrição:**
Validar factory com todos os providers.

**Critérios de Aceite:**
- [ ] Teste com `mock`
- [ ] Teste com `cnpja-open`
- [ ] Teste com `receita-web`
- [ ] `pnpm test` passa

---

#### F3-T8: Atualizar documentação
**Prioridade:** Média | **Estimativa:** 30min | **Dependências:** F3-T7

**Descrição:**
Atualizar README com instruções de configuração.

**Critérios de Aceite:**
- [ ] Seção "Providers" atualizada
- [ ] Instruções de configuração de `receita-web`
- [ ] Limitações documentadas

---

## Fase 4: Modo Comparativo (Nice-to-have)

### Épico: Comparar fontes

**Objetivo:** Permitir comparação manual entre `cnpja-open` e `receita-web`.

**Status:** Implementar apenas se houver tempo após Fases 1-3.

---

### Tarefas

#### F4-T1: Criar script comparativo
**Prioridade:** Baixa | **Estimativa:** 1h | **Dependências:** Fase 3 concluída

**Descrição:**
Script que consulta mesma lista com ambos os providers.

**Critérios de Aceite:**
- [ ] Recebe arquivo CSV com CNPJs
- [ ] Consulta com `cnpja-open`
- [ ] Consulta com `receita-web`

---

#### F4-T2: Gerar relatório comparativo
**Prioridade:** Baixa | **Estimativa:** 1h | **Dependências:** F4-T1

**Descrição:**
Relatório com concordância, divergência e erros.

**Critérios de Aceite:**
- [ ] CSV com colunas lado a lado
- [ ] Resumo de concordância
- [ ] Resumo de divergência
- [ ] Resumo de erros por provider

---

## Checklist Final

### Validação
- [ ] `pnpm test` passa
- [ ] `pnpm typecheck` passa
- [ ] `pnpm build` funciona
- [ ] `pnpm lint` passa

### Funcionalidade
- [ ] `mock` funciona
- [ ] `cnpja-open` funciona
- [ ] `receita-web` funciona com CNPJ real
- [ ] Configuração por arquivo funciona

### Documentação
- [ ] README atualizado
- [ ] Limitações documentadas
- [ ] Relatório do spike existente

### Código
- [ ] Nenhum `any` sem justificativa
- [ ] Erros classificados
- [ ] Fonte registrada no output

---

## Estimativa Total

| Fase | Tempo Estimado |
|------|----------------|
| Fase 1 | 4.5h |
| Fase 2 | 7.5h |
| Fase 3 | 5h |
| Fase 4 | 2h |
| **Total** | **19h** |

**Nota:** Estimativas são aproximadas e podem variar conforme complexidade do portal da Receita.

---

## Próximos Passos

1. **Iniciar Fase 1 - Spike Técnico**
2. Validar viabilidade
3. Se viável, prosseguir com Fase 2
4. Se não viável, documentar e abortar V2

---

## Referências

- [Design Document](./2026-03-26-v2-receita-web-adapter-design.md)
- [Simples Nacional -Consulta Optantes](https://www8.receita.fazenda.gov.br/SimplesNacional/)
