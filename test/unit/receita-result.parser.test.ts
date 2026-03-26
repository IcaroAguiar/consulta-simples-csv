import { describe, expect, it } from "vitest";

import { parseReceitaResult } from "../../src/core/simples/adapters/receita-web/receita-result.parser";

const createSuccessHtml = (optant: boolean, simei: boolean): string => `
<!DOCTYPE html>
<html>
<body>
  <div class="resultado">
    <h2>Consulta Optantes</h2>
    <table>
      <tr><td>Simples Nacional</td><td>${optant ? "Optante" : "Não Optante"}</td></tr>
      <tr><td>SIMEI</td><td>${simei ? "Optante" : "Não Optante"}</td></tr>
    </table>
  </div>
</body>
</html>
`;

const createCaptchaHtml = (): string => `
<!DOCTYPE html>
<html>
<body>
  <div class="captcha-container">
    <img src="/captcha/image.jpg" alt="CAPTCHA" />
    <input type="text" name="captcha" />
  </div>
</body>
</html>
`;

const createBlockedHtml = (): string => `
<!DOCTYPE html>
<html>
<body>
  <div class="error-container">
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
  <div class="error-container">
    <h1>CNPJ Inválido</h1>
    <p>O CNPJ informado é inválido ou incorreto.</p>
  </div>
</body>
</html>
`;

const createTemporaryErrorHtml = (): string => `
<!DOCTYPE html>
<html>
<body>
  <div class="error-container">
    <h1>Erro Temporário</h1>
    <p>Serviço temporariamente indisponível.</p>
  </div>
</body>
</html>
`;

const createUnparsableHtml = (): string => `
<!DOCTYPE html>
<html>
<body>
  <div>
    <p>Conteúdo não reconhecido.</p>
  </div>
</body>
</html>
`;

describe("parseReceitaResult", () => {
  const validCnpj = "00000000000191";

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

    it("returns SUCCESS when neither is optant", () => {
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
      const html = createTemporaryErrorHtml();
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
    it("returns UNPARSABLE_RESULT when no result or error is detected", () => {
      const html = createUnparsableHtml();
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

    it("returns UNPARSABLE_RESULT when result container exists but no optant status", () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <body>
          <div class="resultado">
            <p>Resultado semformatação conhecida</p>
          </div>
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
