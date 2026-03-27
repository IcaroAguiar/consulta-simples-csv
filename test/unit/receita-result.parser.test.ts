import { describe, expect, it } from "vitest";

import { parseReceitaResult } from "../../src/core/simples/adapters/receita-web/receita-result.parser";

// HTML real da Receita (simplificado)
const createSuccessHtml = (
  simplesNacional: boolean,
  simei: boolean,
): string => `
<!DOCTYPE html>
<html>
<body>
  <div>
    <h4>Consulta Optantes</h4>
    <span style="font-size:small;color:gray">A opção pelo Simples Nacional e/ou SIMEI abrange todos os estabelecimentos da empresa</span>
    <br>
    Situação no Simples Nacional: <span class="spanValorVerde">${simplesNacional ? "Optante pelo Simples Nacional" : "NÃO optante pelo Simples Nacional"}</span>
    <br>
    Situação no SIMEI: <span class="spanValorVerde">${simei ? "Enquadrado no SIMEI" : "NÃO enquadrado no SIMEI"}</span>
  </div>
</body>
</html>
`;

const createNotFoundHtml = (): string => `
<!DOCTYPE html>
<html>
<body>
  <div>
    <p>Não foi encontrado nenhum resultado.</p>
  </div>
</body>
</html>
`;

const createCaptchaHtml = (): string => `
<!DOCTYPE html>
<html>
<body>
  <div class="captcha-container">
    <img src="/captcha.jpg" alt="CAPTCHA" />
    <input type="text" name="captcha" />
  </div>
</body>
</html>
`;

const createBlockedHtml = (): string => `
<!DOCTYPE html>
<html>
<body>
  <div>
    <h1>Acesso Bloqueado</h1>
    <p>Seu IP foi bloqueado temporariamente.</p>
  </div>
</body>
</html>
`;

const createInvalidCnpjHtml = (): string => `
<!DOCTYPE html>
<html>
<body>
  <div>
    <h1>CNPJ Inválido</h1>
    <p>O CNPJ informado é inválido ou incorreto.</p>
  </div>
</body>
</html>
`;

const createErrorHtml = (): string => `
<!DOCTYPE html>
<html>
<body>
  <div>
    <h1>Erro Temporário</h1>
    <p>Serviço temporariamente indisponível.</p>
  </div>
</body>
</html>
`;

describe("parseReceitaResult", () => {
  const validCnpj = "47960950000121";

  describe("SUCCESS cases", () => {
    it("returns SUCCESS when both Simples Nacional and SIMEI are optant", () => {
      const html = createSuccessHtml(true, true);
      const result = parseReceitaResult({
        html,
        cnpj: validCnpj,
        hasCaptcha: false,
        hasError: false,
        hasResult: true,
      });

      expect(result).toMatchObject({
        cnpj: validCnpj,
        simplesNacional: true,
        simei: true,
        source: "receita-web",
        status: "SUCCESS",
      });
    });

    it("returns SUCCESS when Simples Nacional is optant but SIMEI is not", () => {
      const html = createSuccessHtml(true, false);
      const result = parseReceitaResult({
        html,
        cnpj: validCnpj,
        hasCaptcha: false,
        hasError: false,
        hasResult: true,
      });

      expect(result).toMatchObject({
        cnpj: validCnpj,
        simplesNacional: true,
        simei: false,
        source: "receita-web",
        status: "SUCCESS",
      });
    });

    it("returns SUCCESS when both are not optant", () => {
      const html = createSuccessHtml(false, false);
      const result = parseReceitaResult({
        html,
        cnpj: validCnpj,
        hasCaptcha: false,
        hasError: false,
        hasResult: true,
      });

      expect(result).toMatchObject({
        cnpj: validCnpj,
        simplesNacional: false,
        simei: false,
        source: "receita-web",
        status: "SUCCESS",
      });
    });

    it("returns SUCCESS with null valores when only Simples Nacional is found", () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <body>
          Situação no Simples Nacional: <span>Optante pelo Simples Nacional</span>
        </body>
        </html>
      `;
      const result = parseReceitaResult({
        html,
        cnpj: validCnpj,
        hasCaptcha: false,
        hasError: false,
        hasResult: true,
      });

      expect(result).toMatchObject({
        cnpj: validCnpj,
        simplesNacional: true,
        simei: null,
        source: "receita-web",
        status: "SUCCESS",
      });
    });
  });

  describe("NOT_FOUND case", () => {
    it("returns NOT_FOUND when not found indicators are present", () => {
      const html = createNotFoundHtml();
      const result = parseReceitaResult({
        html,
        cnpj: validCnpj,
        hasCaptcha: false,
        hasError: false,
        hasResult: true,
      });

      expect(result).toMatchObject({
        cnpj: validCnpj,
        simplesNacional: null,
        simei: null,
        source: "receita-web",
        status: "NOT_FOUND",
      });
    });
  });

  describe("CAPTCHA_REQUIRED case", () => {
    it("returns CAPTCHA_REQUIRED when captcha is detected", () => {
      const html = createCaptchaHtml();
      const result = parseReceitaResult({
        html,
        cnpj: validCnpj,
        hasCaptcha: true,
        hasError: false,
        hasResult: false,
      });

      expect(result).toMatchObject({
        cnpj: validCnpj,
        simplesNacional: null,
        simei: null,
        source: "receita-web",
        status: "CAPTCHA_REQUIRED",
      });
    });
  });

  describe("BLOCKED case", () => {
    it("returns BLOCKED when blocked indicators are present", () => {
      const html = createBlockedHtml();
      const result = parseReceitaResult({
        html,
        cnpj: validCnpj,
        hasCaptcha: false,
        hasError: true,
        hasResult: false,
      });

      expect(result).toMatchObject({
        cnpj: validCnpj,
        simplesNacional: null,
        simei: null,
        source: "receita-web",
        status: "BLOCKED",
      });
    });
  });

  describe("INVALID_CNPJ case", () => {
    it("returns INVALID_CNPJ when invalid CNPJ indicators are present", () => {
      const html = createInvalidCnpjHtml();
      const result = parseReceitaResult({
        html,
        cnpj: validCnpj,
        hasCaptcha: false,
        hasError: true,
        hasResult: false,
      });

      expect(result).toMatchObject({
        cnpj: validCnpj,
        simplesNacional: null,
        simei: null,
        source: "receita-web",
        status: "INVALID_CNPJ",
      });
    });
  });

  describe("TEMPORARY_ERROR case", () => {
    it("returns TEMPORARY_ERROR when error is detected but no specific indicators", () => {
      const html = createErrorHtml();
      const result = parseReceitaResult({
        html,
        cnpj: validCnpj,
        hasCaptcha: false,
        hasError: true,
        hasResult: false,
      });

      expect(result).toMatchObject({
        cnpj: validCnpj,
        simplesNacional: null,
        simei: null,
        source: "receita-web",
        status: "TEMPORARY_ERROR",
      });
    });
  });

  describe("UNPARSABLE_RESULT case", () => {
    it("returns UNPARSABLE_RESULT when no structure is recognized", () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <body>
          <p>Conteúdo não reconhecido.</p>
        </body>
        </html>
      `;
      const result = parseReceitaResult({
        html,
        cnpj: validCnpj,
        hasCaptcha: false,
        hasError: false,
        hasResult: false,
      });

      expect(result).toMatchObject({
        cnpj: validCnpj,
        simplesNacional: null,
        simei: null,
        source: "receita-web",
        status: "UNPARSABLE_RESULT",
      });
    });
  });

  describe("input validation", () => {
    it("preserves CNPJ in output", () => {
      const html = createSuccessHtml(true, true);
      const customCnpj = "12345678000195";
      const result = parseReceitaResult({
        html,
        cnpj: customCnpj,
        hasCaptcha: false,
        hasError: false,
        hasResult: true,
      });

      expect(result.cnpj).toBe(customCnpj);
    });

    it("includes htmlLength in raw field", () => {
      const html = createSuccessHtml(true, true);
      const result = parseReceitaResult({
        html,
        cnpj: validCnpj,
        hasCaptcha: false,
        hasError: false,
        hasResult: true,
      });

      expect(result.raw).toBeDefined();
      expect((result.raw as { htmlLength: number }).htmlLength).toBe(
        html.length,
      );
    });
  });
});
