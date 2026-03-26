import * as fs from "node:fs";
import * as path from "node:path";
import { chromium } from "playwright";

const CONSULTA_OPTANTES_URL =
  "https://www8.receita.fazenda.gov.br/SimplesNacional/Servicos/ConsultaOptantes.aspx";

const EVIDENCE_DIR = path.resolve(process.cwd(), ".ai/spike-evidence");

const TEST_CNPJ = "00000000000191";

type SpikeResult = {
  timestamp: string;
  cnpj: string;
  classification:
    | "SUCCESS"
    | "BLOCKED"
    | "CAPTCHA_REQUIRED"
    | "UNPARSABLE_RESULT"
    | "TEMPORARY_ERROR";
  hasResult: boolean;
  hasCaptcha: boolean;
  hasError: boolean;
  htmlLength: number;
  screenshotPath: string;
  htmlPath: string;
  notes: string[];
};

async function spike(): Promise<SpikeResult> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const notes: string[] = [];

  console.log("=== SPIKE RECEITA WEB ===\n");
  console.log(`Timestamp: ${timestamp}`);
  console.log(`CNPJ de teste: ${TEST_CNPJ}`);
  console.log(`URL: ${CONSULTA_OPTANTES_URL}\n`);

  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  const result: SpikeResult = {
    timestamp,
    cnpj: TEST_CNPJ,
    classification: "TEMPORARY_ERROR",
    hasResult: false,
    hasCaptcha: false,
    hasError: false,
    htmlLength: 0,
    screenshotPath: "",
    htmlPath: "",
    notes,
  };

  try {
    console.log("1. Navegando até o portal...");
    await page.goto(CONSULTA_OPTANTES_URL, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    const initialHtml = await page.content();
    console.log(`   HTML carregado: ${initialHtml.length} caracteres`);

    const initialScreenshot = path.join(
      EVIDENCE_DIR,
      `${timestamp}-01-initial.png`,
    );
    await page.screenshot({ path: initialScreenshot, fullPage: true });
    console.log(`   Screenshot inicial: ${initialScreenshot}\n`);

    console.log("2. Procurando campo CNPJ...");
    const cnpjInput = await page.$(
      'input[name*="cnpj" i], input[id*="cnpj" i], input[type="text"]',
    );

    if (!cnpjInput) {
      notes.push("Campo CNPJ não encontrado");
      result.classification = "UNPARSABLE_RESULT";
      result.htmlLength = initialHtml.length;
      result.screenshotPath = initialScreenshot;
      result.htmlPath = path.join(EVIDENCE_DIR, `${timestamp}-01-initial.html`);
      await fs.promises.writeFile(result.htmlPath, initialHtml, "utf-8");
      throw new Error("Campo CNPJ não encontrado");
    }
    const inputName = await cnpjInput.getAttribute("name");
    const inputId = await cnpjInput.getAttribute("id");
    notes.push(`Campo CNPJ encontrado: name=${inputName}, id=${inputId}`);
    console.log(`   Campo encontrado: name=${inputName}, id=${inputId}\n`);

    console.log("3. Verificando presença de CAPTCHA...");
    const captchaElements = await page.$$(
      '[class*="captcha" i], [id*="captcha" i], img[src*="captcha" i], iframe[src*="captcha" i]',
    );

    if (captchaElements.length > 0) {
      notes.push(`CAPTCHA detectado: ${captchaElements.length} elemento(s)`);
      result.hasCaptcha = true;
      result.classification = "CAPTCHA_REQUIRED";
      console.log(
        `   CAPTCHA detectado: ${captchaElements.length} elemento(s)\n`,
      );
    } else {
      notes.push("Nenhum CAPTCHA visível detectado");
      console.log("   Nenhum CAPTCHA detectado\n");
    }

    console.log("4. Preenchendo CNPJ...");
    await cnpjInput.fill("");
    await cnpjInput.fill(TEST_CNPJ);
    await page.waitForTimeout(500);

    const filledScreenshot = path.join(
      EVIDENCE_DIR,
      `${timestamp}-02-filled.png`,
    );
    await page.screenshot({ path: filledScreenshot, fullPage: true });
    console.log(`   CNPJ preenchido: ${TEST_CNPJ}`);
    console.log(`   Screenshot: ${filledScreenshot}\n`);

    console.log("5. Procurando botão de consulta...");
    const submitButton = await page.$(
      'button[type="submit"], input[type="submit"], button:has-text("Consultar"), button:has-text("Consultar"), input[value*="Consultar" i]',
    );

    if (!submitButton) {
      notes.push("Botão de submit não encontrado");
      console.log("   Botão não encontrado, tentando submit via Enter");
      await cnpjInput.press("Enter");
    } else {
      const buttonText = await submitButton.textContent();
      notes.push(`Botão encontrado: "${buttonText?.trim()}"`);
      console.log(`   Botão encontrado: "${buttonText?.trim()}"`);
      await submitButton.click();
    }

    console.log("\n6. Aguardando resposta...");
    await page.waitForTimeout(3000);

    const responseUrl = page.url();
    notes.push(`URL após submit: ${responseUrl}`);
    console.log(`   URL atual: ${responseUrl}`);

    const responseHtml = await page.content();
    result.htmlLength = responseHtml.length;
    console.log(`   HTML resposta: ${responseHtml.length} caracteres`);

    const responseScreenshot = path.join(
      EVIDENCE_DIR,
      `${timestamp}-03-response.png`,
    );
    await page.screenshot({ path: responseScreenshot, fullPage: true });

    const responseHtmlPath = path.join(
      EVIDENCE_DIR,
      `${timestamp}-03-response.html`,
    );
    await fs.promises.writeFile(responseHtmlPath, responseHtml, "utf-8");

    result.screenshotPath = responseScreenshot;
    result.htmlPath = responseHtmlPath;

    console.log(`   Screenshot resposta: ${responseScreenshot}`);
    console.log(`   HTML salvo: ${responseHtmlPath}\n`);

    console.log("7. Analisando resultado...");

    const errorIndicators = await page.$$(
      '[class*="erro" i], [class*="error" i], :text("inválido"), :text("incorreto"), :text("não encontrado")',
    );

    if (errorIndicators.length > 0) {
      result.hasError = true;
      notes.push(
        `Possível erro detectado: ${errorIndicators.length} indicador(es)`,
      );
    }

    const resultContainers = await page.$$(
      '[class*="resultado" i], [class*="result" i], table',
    );

    if (resultContainers.length > 0) {
      result.hasResult = true;
      notes.push(
        `Possível resultado detectado: ${resultContainers.length} container(s)`,
      );
    }

    if (result.hasCaptcha) {
      result.classification = "CAPTCHA_REQUIRED";
      notes.push("Classificação: CAPTCHA_REQUIRED");
    } else if (
      responseHtml.includes("Simples Nacional") &&
      responseHtml.includes("Optante")
    ) {
      result.classification = "SUCCESS";
      result.hasResult = true;
      notes.push(
        "Classificação: SUCCESS - Página contém indicadores de resultado",
      );
    } else if (result.hasError) {
      result.classification = "BLOCKED";
      notes.push("Classificação: BLOCKED - Erros detectados na resposta");
    } else {
      result.classification = "UNPARSABLE_RESULT";
      notes.push("Classificação: UNPARSABLE_RESULT - HTML não reconhecido");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    notes.push(`ERRO: ${errorMessage}`);
    console.error("\nERRO:", errorMessage);

    if (!result.screenshotPath) {
      const errorScreenshot = path.join(EVIDENCE_DIR, `${timestamp}-error.png`);
      await page
        .screenshot({ path: errorScreenshot, fullPage: true })
        .catch(() => {});
      result.screenshotPath = errorScreenshot;
    }

    if (!result.htmlPath) {
      const errorHtml = await page.content();
      const errorHtmlPath = path.join(EVIDENCE_DIR, `${timestamp}-error.html`);
      await fs.promises
        .writeFile(errorHtmlPath, errorHtml, "utf-8")
        .catch(() => {});
      result.htmlPath = errorHtmlPath;
      result.htmlLength = errorHtml.length;
    }
  } finally {
    await browser.close();
  }

  return result;
}

async function generateReport(result: SpikeResult): Promise<string> {
  const reportPath = path.join(EVIDENCE_DIR, `${result.timestamp}-report.md`);

  const report = `# Spike Report - Receita Web Adapter

## Resumo

**Timestamp:** ${result.timestamp}
**CNPJ:** ${result.cnpj}
**Classificação:** ${result.classification}

## Resultado

- **CAPTCHA detectado:** ${result.hasCaptcha ? "Sim" : "Não"}
- **Erro detectado:** ${result.hasError ? "Sim" : "Não"}
- **Resultado visível:** ${result.hasResult ? "Sim" : "Não"}
- **Tamanho do HTML:** ${result.htmlLength} caracteres

## Arquivos Gerados

- Screenshot: \`${result.screenshotPath}\`
- HTML: \`${result.htmlPath}\`

## Notas

${result.notes.map((n) => `- ${n}`).join("\n")}

## Recomendação

${
  result.classification === "SUCCESS"
    ? "✅ Implementação viável. Prosseguir com Fase2 (Parser)."
    : result.classification === "CAPTCHA_REQUIRED"
      ? "⛔ CAPTCHA detectado. Avaliar estratégias de contorno ou abortar V2."
      : result.classification === "BLOCKED"
        ? "⛔ Bloqueio detectado. Avaliar alternativas ou abortar V2."
        : "⚠️ Resultado não reconhecido. Revisar HTML salvo e ajustar detecção."
}
---
Gerado automaticamente pelo spike técnico.
`;

  await fs.promises.writeFile(reportPath, report, "utf-8");
  return reportPath;
}

async function main() {
  if (!fs.existsSync(EVIDENCE_DIR)) {
    await fs.promises.mkdir(EVIDENCE_DIR, { recursive: true });
  }

  console.log("Iniciando spike...\n");

  const result = await spike();

  console.log("\n=== RESULTADO DO SPIKE ===");
  console.log(`Classificação: ${result.classification}`);
  console.log(`CAPTCHA: ${result.hasCaptcha ? "Sim" : "Não"}`);
  console.log(`Resultado: ${result.hasResult ? "Detectado" : "Não detectado"}`);
  console.log(`HTML: ${result.htmlLength} caracteres`);

  const reportPath = await generateReport(result);
  console.log(`\nRelatório salvo em: ${reportPath}`);

  console.log("\n=== PRÓXIMOS PASSOS ===");
  if (result.classification === "SUCCESS") {
    console.log("✅ Spike passou! Implementação viável.");
    console.log(
      "   Prosseguir com Fase 2: Implementar parser e browser client.",
    );
  } else if (result.classification === "CAPTCHA_REQUIRED") {
    console.log("⛔ CAPTCHA detectado!");
    console.log("   Opções:");
    console.log("   1. Abortar V2 e manter apenas cnpja-open");
    console.log("   2. Pesquisar soluções de CAPTCHA (setup manual, serviços)");
  } else if (result.classification === "BLOCKED") {
    console.log("⛔ Bloqueio detectado!");
    console.log("   Revisar HTML salvo para identificar tipo de bloqueio.");
  } else {
    console.log("⚠️ Resultado não reconhecido.");
    console.log("   Revisar HTML salvo e ajustar lógica de detecção.");
  }
}

main().catch((error) => {
  console.error("Falha no spike:", error);
  process.exit(1);
});
