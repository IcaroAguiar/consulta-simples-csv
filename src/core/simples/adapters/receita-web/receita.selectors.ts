export const RECEITA_SELECTORS = {
  // URL correta do IFRAME de consulta
  url: "https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATBHE/ConsultaOptantes.app/ConsultarOpcao.html",
  // Campo CNPJ - ID específico
  cnpjInput: "#Cnpj",
  // Submit - pode usar Enter ou botão submit
  submitButton: 'input[type="submit"]',
  // CAPTCHA - específico para imagens
  captcha:
    'img[src*="captcha" i], input[name*="captcha" i], input[id*="captcha" i], .captcha-container, #captcha',
  // Container de resultado
  resultContainer: "body",
  // Mensagem de erro/não encontrado
  errorMessage: ".alert-danger, .erro, .text-danger",
} as const;

export const RECEITA_TEXT_INDICATORS = {
  // Optante pelo Simples Nacional
  simplesNacionalOptant: ["Optante pelo Simples Nacional"],
  simplesNacionalNotOptant: ["NÃO optante pelo Simples Nacional"],
  // SIMEI
  simeiOptant: ["Enquadrado no SIMEI", "Optante pelo SIMEI"],
  simeiNotOptant: ["NÃO enquadrado no SIMEI"],
  // Erros - detectados via texto, não CSS
  captcha: ["captcha", "Captcha", "CAPTCHA"],
  blocked: ["bloqueado", "blocked", "acesso negado"],
  invalidCnpj: ["CNPJ inválido", "CNPJ incorreto", "cnpj inválido"],
  notFound: ["Não foi encontrado", "nenhum resultado"],
} as const;
