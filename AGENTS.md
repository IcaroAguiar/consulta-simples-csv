# AGENTS

## Regras do repositório
- Responder ao usuário em português-BR.
- Este projeto é um app desktop Electron com UI mínima; evitar aumentar escopo para backend remoto, banco ou PDF sem pedido explícito.
- `.ai/` é contexto operacional local e não deve ser versionado.
- Preservar a arquitetura `porta + adapters`; nenhum módulo fora de `src/core/simples/adapters` pode conhecer regras específicas do provider.
- `mock` deve continuar funcional como provider offline padrão.
- Em mudanças de código, preferir testes focados no escopo alterado, `typecheck` e build local relevante.

