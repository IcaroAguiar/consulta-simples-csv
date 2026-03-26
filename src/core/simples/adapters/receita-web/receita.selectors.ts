export const RECEITA_SELECTORS = {
  url: "https://www8.receita.fazenda.gov.br/SimplesNacional/Servicos/ConsultaOptantes.aspx",
  cnpjInput: 'input[name*="cnpj" i], input[id*="cnpj" i], input[type="text"]',
  submitButton:
    'button[type="submit"], input[type="submit"], button:has-text("Consultar"), input[value*="Consultar" i]',
  captcha:
    '[class*="captcha" i], [id*="captcha" i], img[src*="captcha" i], iframe[src*="captcha" i]',
  errorIndicators:
    '[class*="erro" i], [class*="error" i], :text("inválido"), :text("incorreto"), :text("não encontrado")',
  resultContainer: '[class*="resultado" i], [class*="result" i], table',
  simplesNacionalOptant: ':text("Optante"), :text("Simples Nacional")',
  simeiOptant: ':text("SIMEI"), :text("Microempreendedor")',
  notOptant: ':text("Não Optante"), :text("não optante")',
} as const;

export const RECEITA_TEXT_INDICATORS = {
  simplesNacionalOptant: ["Optante", "Simples Nacional"],
  simeiOptant: ["SIMEI", "Microempreendedor Individual"],
  notOptant: ["Não Optante", "não optante"],
  captcha: ["captcha", "Captcha", "CAPTCHA"],
  blocked: ["bloqueado", "blocked", "acesso negado"],
  invalidCnpj: ["inválido", "incorreto", "CNPJ inválido"],
} as const;
