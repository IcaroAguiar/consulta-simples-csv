import type { Page } from "playwright";
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

export class ReceitaBrowserClient {
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
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const launchOptions: Parameters<typeof chromium.launch>[0] = {
      headless: this.headless,
      args: ["--disable-blink-features=AutomationControlled"],
    };

    if (this.executablePath) {
      launchOptions.executablePath = this.executablePath;
    }

    const browser = await chromium.launch(launchOptions);

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    this.page = await context.newPage();
  }

  async disconnect(): Promise<void> {
    if (this.page) {
      const browser = this.page.context().browser();
      await this.page.close();
      if (browser) {
        await browser.close();
      }
      this.page = null;
    }
  }

  async navigate(signal?: AbortSignal): Promise<ReceitaNavigationResult> {
    if (!this.page) {
      return { success: false, html: "", error: "Browser not connected" };
    }

    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    try {
      await this.page.goto(RECEITA_SELECTORS.url, {
        waitUntil: "networkidle",
        timeout: this.timeout,
      });

      const html = await this.page.content();

      return { success: true, html };
    } catch (error) {
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

    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    try {
      const cnpjInput = await this.page.$(RECEITA_SELECTORS.cnpjInput);

      if (!cnpjInput) {
        return { success: false, html: "", error: "CNPJ input not found" };
      }

      await cnpjInput.fill("");
      await cnpjInput.fill(cnpj);
      await this.page.waitForTimeout(500);

      const html = await this.page.content();

      return { success: true, html };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Fill CNPJ failed";
      return { success: false, html: "", error: message };
    }
  }

  async submit(signal?: AbortSignal): Promise<ReceitaNavigationResult> {
    if (!this.page) {
      return { success: false, html: "", error: "Browser not connected" };
    }

    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    try {
      const submitButton = await this.page.$(RECEITA_SELECTORS.submitButton);

      if (submitButton) {
        await submitButton.click();
      } else {
        const cnpjInput = await this.page.$(RECEITA_SELECTORS.cnpjInput);
        if (cnpjInput) {
          await cnpjInput.press("Enter");
        }
      }

      const html = await this.page.content();

      return { success: true, html };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Submit failed";
      return { success: false, html: "", error: message };
    }
  }

  async waitResult(signal?: AbortSignal): Promise<ReceitaNavigationResult> {
    if (!this.page) {
      return { success: false, html: "", error: "Browser not connected" };
    }

    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    try {
      await this.page.waitForTimeout(3000);

      const html = await this.page.content();

      return { success: true, html };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Wait result failed";
      return { success: false, html: "", error: message };
    }
  }

  async hasCaptcha(signal?: AbortSignal): Promise<boolean> {
    if (!this.page) {
      return false;
    }

    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

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

    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    try {
      const errorElements = await this.page.$$(
        RECEITA_SELECTORS.errorIndicators,
      );
      return errorElements.length > 0;
    } catch {
      return false;
    }
  }

  async hasResult(signal?: AbortSignal): Promise<boolean> {
    if (!this.page) {
      return false;
    }

    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    try {
      const resultContainers = await this.page.$$(
        RECEITA_SELECTORS.resultContainer,
      );
      return resultContainers.length > 0;
    } catch {
      return false;
    }
  }
}
