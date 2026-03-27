# AGENTS

## Regras do repositório
- Responder ao usuário em português-BR.
- Este projeto é um app desktop Electron com UI mínima; evitar aumentar escopo para backend remoto, banco ou PDF sem pedido explícito.
- `.ai/` é contexto operacional local e não deve ser versionado.
- Preservar a arquitetura `porta + adapters`; nenhum módulo fora de `src/core/simples/adapters` pode conhecer regras específicas do provider.
- `mock` deve continuar funcional como provider offline padrão.
- `receita-web` deve ser tratado como modo assistido e experimental: navegador visível, sujeito a bloqueio anti-bot e sem promessa de automação robusta em lote; na release Windows, depende de Chrome ou Edge instalados na máquina do usuário.
- Em mudanças de código, preferir testes focados no escopo alterado, `typecheck` e build local relevante.
