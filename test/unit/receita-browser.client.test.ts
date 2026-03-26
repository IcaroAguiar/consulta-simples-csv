import { chromium } from "playwright";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ReceitaBrowserClient } from "../../src/core/simples/adapters/receita-web/receita-browser.client";

vi.mock("playwright", () => ({
  chromium: {
    launch: vi.fn(),
  },
}));

const mockPage = {
  goto: vi.fn(),
  content: vi.fn(),
  $: vi.fn(),
  $$: vi.fn(),
  close: vi.fn(),
  context: vi.fn(() => mockContext),
  waitForTimeout: vi.fn(),
  waitForSelector: vi.fn(),
  waitForFunction: vi.fn(),
  textContent: vi.fn(),
};

const mockContext = {
  newPage: vi.fn(),
  browser: vi.fn(),
};

const mockBrowser = {
  newContext: vi.fn(),
  close: vi.fn(),
};

describe("ReceitaBrowserClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockBrowser.newContext.mockResolvedValue(mockContext);
    mockContext.newPage.mockResolvedValue(mockPage);
    mockContext.browser.mockReturnValue(mockBrowser);
    mockPage.close.mockResolvedValue(undefined);
    mockBrowser.close.mockResolvedValue(undefined);
    vi.mocked(chromium.launch).mockResolvedValue(
      mockBrowser as unknown as Awaited<ReturnType<typeof chromium.launch>>,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("uses default options when none provided", () => {
      const client = new ReceitaBrowserClient();

      expect(client).toBeInstanceOf(ReceitaBrowserClient);
    });

    it("uses custom timeout option", () => {
      const client = new ReceitaBrowserClient({ timeout: 60000 });

      expect(client).toBeInstanceOf(ReceitaBrowserClient);
    });

    it("uses custom headless option", () => {
      const client = new ReceitaBrowserClient({ headless: false });

      expect(client).toBeInstanceOf(ReceitaBrowserClient);
    });

    it("uses custom executablePath option", () => {
      const client = new ReceitaBrowserClient({
        executablePath: "/path/to/browser",
      });

      expect(client).toBeInstanceOf(ReceitaBrowserClient);
    });
  });

  describe("connect and disconnect lifecycle", () => {
    it("connects and disconnects browser correctly", async () => {
      const client = new ReceitaBrowserClient();

      await client.connect();
      expect(chromium.launch).toHaveBeenCalledTimes(1);
      expect(chromium.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          headless: true,
          args: ["--disable-blink-features=AutomationControlled"],
        }),
      );

      expect(mockBrowser.newContext).toHaveBeenCalledTimes(1);
      expect(mockContext.newPage).toHaveBeenCalledTimes(1);

      await client.disconnect();

      expect(mockPage.close).toHaveBeenCalledTimes(1);
      expect(mockBrowser.close).toHaveBeenCalledTimes(1);
    });

    it("throws AbortError when signal already aborted in connect", async () => {
      const client = new ReceitaBrowserClient();
      const controller = new AbortController();
      controller.abort();

      await expect(client.connect(controller.signal)).rejects.toThrow(
        "Aborted",
      );
    });
  });

  describe("error handling for unconnected browser", () => {
    it("returns error when navigate called without connection", async () => {
      const client = new ReceitaBrowserClient();

      const result = await client.navigate();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Browser not connected");
    });

    it("returns error when fillCnpj called without connection", async () => {
      const client = new ReceitaBrowserClient();

      const result = await client.fillCnpj("00000000000191");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Browser not connected");
    });

    it("returns error when submit called without connection", async () => {
      const client = new ReceitaBrowserClient();

      const result = await client.submit();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Browser not connected");
    });

    it("returns error when waitResult called without connection", async () => {
      const client = new ReceitaBrowserClient();

      const result = await client.waitResult();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Browser not connected");
    });

    it("returns false when hasCaptcha called without connection", async () => {
      const client = new ReceitaBrowserClient();

      const result = await client.hasCaptcha();

      expect(result).toBe(false);
    });

    it("returns false when hasError called without connection", async () => {
      const client = new ReceitaBrowserClient();

      const result = await client.hasError();

      expect(result).toBe(false);
    });

    it("returns false when hasResult called without connection", async () => {
      const client = new ReceitaBrowserClient();

      const result = await client.hasResult();

      expect(result).toBe(false);
    });
  });

  describe("navigate", () => {
    it("navigates to receita url and returns html", async () => {
      mockPage.goto.mockResolvedValue({});
      mockPage.waitForSelector.mockResolvedValue(undefined);
      mockPage.content.mockResolvedValue(
        "<html><body>Test content</body></html>",
      );

      const client = new ReceitaBrowserClient({ timeout: 5000 });
      await client.connect();

      const result = await client.navigate();

      expect(result.success).toBe(true);
      expect(result.html).toBe("<html><body>Test content</body></html>");
      expect(result.error).toBeUndefined();
      expect(mockPage.goto).toHaveBeenCalledWith(
        expect.stringContaining("receita.fazenda.gov.br"),
        expect.objectContaining({ waitUntil: "domcontentloaded", timeout: 5000 }),
      );
      expect(mockPage.waitForSelector).toHaveBeenCalledWith(
        "#Cnpj",
        expect.objectContaining({ timeout: 5000 }),
      );
    });

    it("throws AbortError when signal aborted during navigate", async () => {
      const client = new ReceitaBrowserClient();
      await client.connect();

      const controller = new AbortController();
      controller.abort();

      await expect(client.navigate(controller.signal)).rejects.toThrow(
        "Aborted",
      );
    });

    it("returns error result on navigation failure", async () => {
      mockPage.goto.mockRejectedValue(new Error("Timeout exceeded"));

      const client = new ReceitaBrowserClient();
      await client.connect();

      const result = await client.navigate();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Timeout exceeded");
      expect(result.html).toBe("");
    });
  });

  describe("fillCnpj", () => {
    it("fills cnpj input and returns html", async () => {
      const mockInputElement = {
        fill: vi.fn().mockResolvedValue(undefined),
      };

      mockPage.$.mockResolvedValue(mockInputElement);
      mockPage.content.mockResolvedValue("<html><body>filled</body></html>");
      mockPage.waitForTimeout.mockResolvedValue(undefined);

      const client = new ReceitaBrowserClient();
      await client.connect();

      const result = await client.fillCnpj("00000000000191");

      expect(result.success).toBe(true);
      expect(result.html).toBe("<html><body>filled</body></html>");
      expect(mockInputElement.fill).toHaveBeenCalledWith("00000000000191");
    });

    it("returns error when cnpj input not found", async () => {
      mockPage.$.mockResolvedValue(null);

      const client = new ReceitaBrowserClient();
      await client.connect();

      const result = await client.fillCnpj("00000000000191");

      expect(result.success).toBe(false);
      expect(result.error).toBe("CNPJ input not found");
    });

    it("throws AbortError when signal aborted during fillCnpj", async () => {
      const client = new ReceitaBrowserClient();
      await client.connect();

      const controller = new AbortController();
      controller.abort();

      await expect(
        client.fillCnpj("00000000000191", controller.signal),
      ).rejects.toThrow("Aborted");
    });
  });

  describe("submit", () => {
    it("clicks submit button and returns html", async () => {
      const mockSubmitButton = {
        click: vi.fn().mockResolvedValue(undefined),
      };

      mockPage.$.mockResolvedValue(mockSubmitButton);
      mockPage.content.mockResolvedValue("<html><body>submitted</body></html>");

      const client = new ReceitaBrowserClient();
      await client.connect();

      const result = await client.submit();

      expect(result.success).toBe(true);
      expect(result.html).toBe("<html><body>submitted</body></html>");
      expect(mockSubmitButton.click).toHaveBeenCalledTimes(1);
    });

    it("presses Enter when submit button not found", async () => {
      const mockInputElement = {
        press: vi.fn().mockResolvedValue(undefined),
      };

      mockPage.$.mockResolvedValueOnce(null); // submit button not found
      mockPage.$.mockResolvedValueOnce(mockInputElement); // CNPJ input
      mockPage.content.mockResolvedValue("<html><body>submitted</body></html>");

      const client = new ReceitaBrowserClient();
      await client.connect();

      const result = await client.submit();

      expect(result.success).toBe(true);
      expect(mockInputElement.press).toHaveBeenCalledWith("Enter");
    });

    it("returns error when browser not connected", async () => {
      const client = new ReceitaBrowserClient();

      const result = await client.submit();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Browser not connected");
    });

    it("throws AbortError when signal aborted during submit", async () => {
      const client = new ReceitaBrowserClient();
      await client.connect();

      const controller = new AbortController();
      controller.abort();

      await expect(client.submit(controller.signal)).rejects.toThrow("Aborted");
    });
  });

  describe("waitResult", () => {
    it("waits for result and returns html", async () => {
      mockPage.waitForTimeout.mockResolvedValue(undefined);
      mockPage.waitForFunction.mockResolvedValue(undefined);
      mockPage.content.mockResolvedValue(
        "<html><body>result content</body></html>",
      );

      const client = new ReceitaBrowserClient();
      await client.connect();

      const result = await client.waitResult();

      expect(result.success).toBe(true);
      expect(result.html).toBe("<html><body>result content</body></html>");
    });

    it("throws AbortError when signal aborted during waitResult", async () => {
      const client = new ReceitaBrowserClient();
      await client.connect();

      const controller = new AbortController();
      controller.abort();

      await expect(client.waitResult(controller.signal)).rejects.toThrow(
        "Aborted",
      );
    });
  });

  describe("hasCaptcha", () => {
    it("returns true when captcha elements found", async () => {
      mockPage.$$.mockResolvedValue([{ type: "captcha" }]);

      const client = new ReceitaBrowserClient();
      await client.connect();

      const result = await client.hasCaptcha();

      expect(result).toBe(true);
    });

    it("returns false when no captcha elements", async () => {
      mockPage.$$.mockResolvedValue([]);

      const client = new ReceitaBrowserClient();
      await client.connect();

      const result = await client.hasCaptcha();

      expect(result).toBe(false);
    });

    it("throws AbortError when signal aborted during hasCaptcha", async () => {
      const client = new ReceitaBrowserClient();
      await client.connect();

      const controller = new AbortController();
      controller.abort();

      await expect(client.hasCaptcha(controller.signal)).rejects.toThrow(
        "Aborted",
      );
    });
  });

  describe("hasError", () => {
    it("returns true when visible error elements found", async () => {
      const mockErrorElement = {
        isVisible: vi.fn().mockResolvedValue(true),
      };
      mockPage.$$.mockResolvedValue([mockErrorElement]);

      const client = new ReceitaBrowserClient();
      await client.connect();

      const result = await client.hasError();

      expect(result).toBe(true);
    });

    it("returns false when error elements are not visible", async () => {
      const mockErrorElement = {
        isVisible: vi.fn().mockResolvedValue(false),
      };
      mockPage.$$.mockResolvedValue([mockErrorElement]);

      const client = new ReceitaBrowserClient();
      await client.connect();

      const result = await client.hasError();

      expect(result).toBe(false);
    });

    it("returns false when no error elements", async () => {
      mockPage.$$.mockResolvedValue([]);

      const client = new ReceitaBrowserClient();
      await client.connect();

      const result = await client.hasError();

      expect(result).toBe(false);
    });

    it("throws AbortError when signal aborted during hasError", async () => {
      const client = new ReceitaBrowserClient();
      await client.connect();

      const controller = new AbortController();
      controller.abort();

      await expect(client.hasError(controller.signal)).rejects.toThrow(
        "Aborted",
      );
    });
  });

  describe("hasResult", () => {
    it("detects result when Situação no Simples Nacional is present", async () => {
      mockPage.textContent.mockResolvedValue(
        "Situação no Simples Nacional: Optante pelo Simples Nacional",
      );

      const client = new ReceitaBrowserClient();
      await client.connect();

      const result = await client.hasResult();

      expect(result).toBe(true);
    });

    it("detects result when SIMEI text is present", async () => {
      mockPage.textContent.mockResolvedValue(
        "Situação no SIMEI: enquadrado no SIMEI",
      );

      const client = new ReceitaBrowserClient();
      await client.connect();

      const result = await client.hasResult();

      expect(result).toBe(true);
    });

    it("detects result when NÃO optante is present", async () => {
      mockPage.textContent.mockResolvedValue(
        "NÃO optante pelo Simples Nacional",
      );

      const client = new ReceitaBrowserClient();
      await client.connect();

      const result = await client.hasResult();

      expect(result).toBe(true);
    });

    it("returns false when no result indicators found", async () => {
      mockPage.textContent.mockResolvedValue("Outro conteúdo qualquer");

      const client = new ReceitaBrowserClient();
      await client.connect();

      const result = await client.hasResult();

      expect(result).toBe(false);
    });

    it("returns false when textContent is null", async () => {
      mockPage.textContent.mockResolvedValue(null);

      const client = new ReceitaBrowserClient();
      await client.connect();

      const result = await client.hasResult();

      expect(result).toBe(false);
    });

    it("throws AbortError when signal aborted during hasResult", async () => {
      const client = new ReceitaBrowserClient();
      await client.connect();

      const controller = new AbortController();
      controller.abort();

      await expect(client.hasResult(controller.signal)).rejects.toThrow(
        "Aborted",
      );
    });
  });

  describe("custom options", () => {
    it("passes custom headless option to browser launch", async () => {
      const client = new ReceitaBrowserClient({ headless: false });
      await client.connect();
      expect(chromium.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          headless: false,
        }),
      );
    });

    it("passes custom executablePath option to browser launch", async () => {
      const client = new ReceitaBrowserClient({
        executablePath: "/custom/chrome",
      });
      await client.connect();
      expect(chromium.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          executablePath: "/custom/chrome",
        }),
      );
    });
  });
});
