import type { Browser, BrowserContext, Page } from "playwright";
import { chromium } from "playwright";
import { RECEITA_SELECTORS } from "./receita.selectors.js";

export type ReceitaBrowserClientOptions = {
  timeout?: number;
  headless?: boolean;
  executablePath?: string;
};

export type ReceitaNavigationResult = {
  success: boolean;
  html: string;
  error?: string;
};

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
}

async function raceWithAbort<T>(
  promise: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  throwIfAborted(signal);

  if (!signal) {
    return promise;
  }

  return await Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      const onAbort = () => {
        signal.removeEventListener("abort", onAbort);
        reject(new DOMException("Aborted", "AbortError"));
      };

      signal.addEventListener("abort", onAbort, { once: true });
      void promise.finally(() => {
        signal.removeEventListener("abort", onAbort);
      });
    }),
  ]);
}

export class ReceitaBrowserClient {
  private browser: Browser | null = null;

  private context: BrowserContext | null = null;

  private page: Page | null = null;

  private readonly timeout: number;

  private readonly headless: boolean;

  private readonly executablePath: string | undefined;

  constructor(options: ReceitaBrowserClientOptions = {}) {
    this.timeout = options.timeout ?? 30000;
    this.headless = options.headless ?? true;
    this.executablePath = options.executablePath;
  }

  async connect(signal?: AbortSignal): Promise<void> {
    throwIfAborted(signal);

    const launchOptions: Parameters<typeof chromium.launch>[0] = {
      headless: this.headless,
      args: ["--disable-blink-features=AutomationControlled"],
    };

    if (this.executablePath) {
      launchOptions.executablePath = this.executablePath;
    }

    let browser: Browser | null = null;
    let context: BrowserContext | null = null;

    try {
      browser = await chromium.launch(launchOptions);
      context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      });

      this.browser = browser;
      this.context = context;
      this.page = await context.newPage();
    } catch (error) {
      if (context) {
        await context.close().catch(() => {});
      }

      if (browser) {
        await browser.close().catch(() => {});
      }

      this.browser = null;
      this.context = null;
      this.page = null;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.page) {
      await this.page.close().catch(() => {});
    }

    if (this.context) {
      await this.context.close().catch(() => {});
    }

    if (this.browser) {
      await this.browser.close().catch(() => {});
    }

    this.page = null;
    this.context = null;
    this.browser = null;
  }

  async navigate(signal?: AbortSignal): Promise<ReceitaNavigationResult> {
    if (!this.page) {
      return { success: false, html: "", error: "Browser not connected" };
    }

    throwIfAborted(signal);

    try {
      await raceWithAbort(
        this.page.goto(RECEITA_SELECTORS.url, {
          waitUntil: "domcontentloaded",
          timeout: this.timeout,
        }),
        signal,
      );

      // Aguardar o campo CNPJ aparecer
      await raceWithAbort(
        this.page.waitForSelector(RECEITA_SELECTORS.cnpjInput, {
          timeout: this.timeout,
        }),
        signal,
      );

      const html = await this.page.content();

      return { success: true, html };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : "Navigation failed";
      return { success: false, html: "", error: message };
    }
  }

  async fillCnpj(
    cnpj: string,
    signal?: AbortSignal,
  ): Promise<ReceitaNavigationResult> {
    if (!this.page) {
      return { success: false, html: "", error: "Browser not connected" };
    }

    throwIfAborted(signal);

    try {
      const cnpjInput = await this.page.$(RECEITA_SELECTORS.cnpjInput);

      if (!cnpjInput) {
        return { success: false, html: "", error: "CNPJ input not found" };
      }

      await cnpjInput.fill("");
      await cnpjInput.fill(cnpj);
      await raceWithAbort(this.page.waitForTimeout(500), signal);

      const html = await this.page.content();

      return { success: true, html };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : "Fill CNPJ failed";
      return { success: false, html: "", error: message };
    }
  }

  async submit(signal?: AbortSignal): Promise<ReceitaNavigationResult> {
    if (!this.page) {
      return { success: false, html: "", error: "Browser not connected" };
    }

    throwIfAborted(signal);

    try {
      const submitButton = await this.page.$(RECEITA_SELECTORS.submitButton);

      if (submitButton) {
        await submitButton.click();
      } else {
        // Se não houver botão, pressionar Enter no campo CNPJ
        const cnpjInput = await this.page.$(RECEITA_SELECTORS.cnpjInput);
        if (cnpjInput) {
          await cnpjInput.press("Enter");
        }
      }

      const html = await this.page.content();

      return { success: true, html };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }

      const message = error instanceof Error ? error.message : "Submit failed";
      return { success: false, html: "", error: message };
    }
  }

  async waitResult(signal?: AbortSignal): Promise<ReceitaNavigationResult> {
    if (!this.page) {
      return { success: false, html: "", error: "Browser not connected" };
    }

    throwIfAborted(signal);

    try {
      // Aguardar a página de resultado carregar
      await raceWithAbort(this.page.waitForTimeout(5000), signal);

      // Aguardar indicadores de resultado aparecerem
      try {
        await raceWithAbort(
          this.page.waitForFunction(
            () => {
              const body = document.body.textContent || "";
              return (
                body.includes("Situação no Simples Nacional") ||
                body.includes("Não foi encontrado") ||
                body.includes("CNPJ:")
              );
            },
            { timeout: 15000 },
          ),
          signal,
        );
      } catch {
        // Continuar mesmo se não encontrar indicadores
      }

      const html = await this.page.content();

      return { success: true, html };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : "Wait result failed";
      return { success: false, html: "", error: message };
    }
  }

  async hasCaptcha(signal?: AbortSignal): Promise<boolean> {
    if (!this.page) {
      return false;
    }

    throwIfAborted(signal);

    try {
      const captchaElements = await this.page.$$(RECEITA_SELECTORS.captcha);
      return captchaElements.length > 0;
    } catch {
      return false;
    }
  }

  async hasError(signal?: AbortSignal): Promise<boolean> {
    if (!this.page) {
      return false;
    }

    throwIfAborted(signal);

    try {
      // Verificar se há elementos de erro VISIBLE
      const errorElements = await this.page.$$(RECEITA_SELECTORS.errorMessage);

      // Filtrar apenas elementos visíveis
      for (const el of errorElements) {
        const isVisible = await el.isVisible();
        if (isVisible) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  async hasResult(signal?: AbortSignal): Promise<boolean> {
    if (!this.page) {
      return false;
    }

    throwIfAborted(signal);

    try {
      const bodyText = await this.page.textContent("body");
      if (!bodyText) return false;

      // Verificar se há indicadores de resultado específicos
      return (
        bodyText.includes("Situação no Simples Nacional") ||
        bodyText.includes("Optante pelo Simples Nacional") ||
        bodyText.includes("NÃO optante") ||
        bodyText.includes("enquadrado no SIMEI")
      );
    } catch {
      return false;
    }
  }
}
