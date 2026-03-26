export const RECEITA_SELECTORS = {
  url: "https://www8.receita.fazenda.gov.br/SimplesNacional/Servicos/ConsultaOptantes.aspx",
  // Campo de busca no header - name attribute é usado
  cnpjInput: 'input[name="ctl00$txtBusca"]',
  // Botão de busca - usa __doPostBack
  submitButton: 'button[aria-label="Pesquisar"]',
  // CAPTCHA não detectado na consulta inicial
  captcha:
    '[class*="captcha" i], [id*="captcha" i], img[src*="captcha" i], iframe[src*="captcha" i]',
  // Container de resultado - USA ID, não classe
  resultContainer: '#resultado-busca',
  // Mensagem de erro/não encontrado
  errorMessage: '#ctl00_ContentPlaceHolder_lblMsg',
  // Indicadores de erro no texto
  errorIndicators:
    '[class*="erro" i], [class*="error" i], :text("inválido"), :text("incorreto"), :text("não encontrado")',
} as const;

export const RECEITA_TEXT_INDICATORS = {
  simplesNacionalOptant: ["Optante", "Simples Nacional"],
  simeiOptant: ["SIMEI", "Microempreendedor Individual"],
  notOptant: ["Não Optante", "não optante"],
  captcha: ["captcha", "Captcha", "CAPTCHA"],
  blocked: ["bloqueado", "blocked", "acesso negado"],
  invalidCnpj: ["CNPJ inválido", "CNPJ incorreto"],
  notFound: ["Não foi encontrado nenhum resultado", "nenhum resultado"],
} as const;
