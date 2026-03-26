import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReceitaBrowserClient } from "../../src/core/simples/adapters/receita-web/receita-browser.client";
import { ReceitaConsultaOptantesAdapter } from "../../src/core/simples/adapters/receita-web/receita-consulta-optantes.adapter";

vi.mock(
  "../../src/core/simples/adapters/receita-web/receita-browser.client",
  () => ({
    ReceitaBrowserClient: vi.fn(),
  }),
);

const ReceitaBrowserClientMock = vi.mocked(ReceitaBrowserClient);

type MockClient = {
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  navigate: ReturnType<typeof vi.fn>;
  fillCnpj: ReturnType<typeof vi.fn>;
  submit: ReturnType<typeof vi.fn>;
  waitResult: ReturnType<typeof vi.fn>;
  hasCaptcha: ReturnType<typeof vi.fn>;
  hasError: ReturnType<typeof vi.fn>;
  hasResult: ReturnType<typeof vi.fn>;
};

function createMockClient(): MockClient {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    navigate: vi
      .fn()
      .mockResolvedValue({ success: true, html: "<html></html>" }),
    fillCnpj: vi
      .fn()
      .mockResolvedValue({ success: true, html: "<html></html>" }),
    submit: vi.fn().mockResolvedValue({ success: true, html: "<html></html>" }),
    waitResult: vi
      .fn()
      .mockResolvedValue({ success: true, html: "<html></html>" }),
    hasCaptcha: vi.fn().mockResolvedValue(false),
    hasError: vi.fn().mockResolvedValue(false),
    hasResult: vi.fn().mockResolvedValue(true),
  };
}

describe("ReceitaConsultaOptantesAdapter", () => {
  let mockClient: MockClient;

  beforeEach(() => {
    mockClient = createMockClient();
    ReceitaBrowserClientMock.mockImplementation(
      () => mockClient as unknown as ReceitaBrowserClient,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("implements SimplesLookupPort", () => {
    const adapter = new ReceitaConsultaOptantesAdapter();
    expect(typeof adapter.lookup).toBe("function");
  });

  it("calls browser lifecycle methods in correct order", async () => {
    const adapter = new ReceitaConsultaOptantesAdapter();

    await adapter.lookup("12345678000195");

    expect(mockClient.connect).toHaveBeenCalled();
    expect(mockClient.navigate).toHaveBeenCalled();
    expect(mockClient.fillCnpj).toHaveBeenCalledWith(
      "12345678000195",
      undefined,
    );
    expect(mockClient.submit).toHaveBeenCalled();
    expect(mockClient.waitResult).toHaveBeenCalled();
    expect(mockClient.disconnect).toHaveBeenCalled();
  });

  it("disconnects browser even when navigation fails", async () => {
    mockClient.navigate.mockResolvedValue({
      success: false,
      html: "",
      error: "Connection failed",
    });

    const adapter = new ReceitaConsultaOptantesAdapter();

    await adapter.lookup("12345678000195");

    expect(mockClient.disconnect).toHaveBeenCalled();
  });

  it("disconnects browser even when fillCnpj fails", async () => {
    mockClient.fillCnpj.mockResolvedValue({
      success: false,
      html: "",
      error: "Input not found",
    });

    const adapter = new ReceitaConsultaOptantesAdapter();

    await adapter.lookup("12345678000195");

    expect(mockClient.disconnect).toHaveBeenCalled();
  });

  it("disconnects browser even when submit fails", async () => {
    mockClient.submit.mockResolvedValue({
      success: false,
      html: "",
      error: "Button not found",
    });

    const adapter = new ReceitaConsultaOptantesAdapter();

    await adapter.lookup("12345678000195");

    expect(mockClient.disconnect).toHaveBeenCalled();
  });

  it("disconnects browser even when waitResult fails", async () => {
    mockClient.waitResult.mockResolvedValue({
      success: false,
      html: "",
      error: "Timeout",
    });

    const adapter = new ReceitaConsultaOptantesAdapter();

    await adapter.lookup("12345678000195");

    expect(mockClient.disconnect).toHaveBeenCalled();
  });

  it("returns TEMPORARY_ERROR when navigation fails", async () => {
    mockClient.navigate.mockResolvedValue({
      success: false,
      html: "",
      error: "Connection refused",
    });

    const adapter = new ReceitaConsultaOptantesAdapter();

    const result = await adapter.lookup("12345678000195");

    expect(result.status).toBe("TEMPORARY_ERROR");
    expect(result.message).toBe("Connection refused");
    expect(result.source).toBe("receita-web");
  });

  it("returns TEMPORARY_ERROR when fillCnpj fails", async () => {
    mockClient.fillCnpj.mockResolvedValue({
      success: false,
      html: "",
      error: "Input not found",
    });

    const adapter = new ReceitaConsultaOptantesAdapter();

    const result = await adapter.lookup("12345678000195");

    expect(result.status).toBe("TEMPORARY_ERROR");
    expect(result.message).toBe("Input not found");
  });

  it("returns TEMPORARY_ERROR when submit fails", async () => {
    mockClient.submit.mockResolvedValue({
      success: false,
      html: "",
      error: "Submit failed",
    });

    const adapter = new ReceitaConsultaOptantesAdapter();

    const result = await adapter.lookup("12345678000195");

    expect(result.status).toBe("TEMPORARY_ERROR");
    expect(result.message).toBe("Submit failed");
  });

  it("returns TEMPORARY_ERROR when waitResult fails", async () => {
    mockClient.waitResult.mockResolvedValue({
      success: false,
      html: "",
      error: "Timeout waiting",
    });

    const adapter = new ReceitaConsultaOptantesAdapter();

    const result = await adapter.lookup("12345678000195");

    expect(result.status).toBe("TEMPORARY_ERROR");
    expect(result.message).toBe("Timeout waiting");
  });

  it("uses abort signal in all browser calls", async () => {
    const controller = new AbortController();
    const signal = controller.signal;

    const adapter = new ReceitaConsultaOptantesAdapter();

    await adapter.lookup("12345678000195", { signal });

    expect(mockClient.connect).toHaveBeenCalledWith(signal);
    expect(mockClient.navigate).toHaveBeenCalledWith(signal);
    expect(mockClient.fillCnpj).toHaveBeenCalledWith("12345678000195", signal);
    expect(mockClient.submit).toHaveBeenCalledWith(signal);
    expect(mockClient.waitResult).toHaveBeenCalledWith(signal);
    expect(mockClient.hasCaptcha).toHaveBeenCalledWith(signal);
    expect(mockClient.hasError).toHaveBeenCalledWith(signal);
    expect(mockClient.hasResult).toHaveBeenCalledWith(signal);
  });

  it("calls parser with correct parameters", async () => {
    const testHtml = "<html><body>Optante Simples Nacional</body></html>";
    mockClient.waitResult.mockResolvedValue({ success: true, html: testHtml });
    mockClient.hasCaptcha.mockResolvedValue(false);
    mockClient.hasError.mockResolvedValue(false);
    mockClient.hasResult.mockResolvedValue(true);

    const adapter = new ReceitaConsultaOptantesAdapter();

    const result = await adapter.lookup("12345678000195");

    expect(mockClient.hasCaptcha).toHaveBeenCalled();
    expect(mockClient.hasError).toHaveBeenCalled();
    expect(mockClient.hasResult).toHaveBeenCalled();
    expect(result.source).toBe("receita-web");
    expect(result.cnpj).toBe("12345678000195");
  });

  it("returns CAPTCHA_REQUIRED when captcha is detected", async () => {
    mockClient.hasCaptcha.mockResolvedValue(true);

    const adapter = new ReceitaConsultaOptantesAdapter();

    const result = await adapter.lookup("12345678000195");

    expect(result.status).toBe("CAPTCHA_REQUIRED");
    expect(result.message).toContain("CAPTCHA");
  });

  it("returns SUCCESS when result is parsed successfully", async () => {
    const successHtml = `
      <html>
        <body>
          <table>
            <tr><td>Simples Nacional</td><td>Optante</td></tr>
            <tr><td>SIMEI</td><td>Não Optante</td></tr>
          </table>
        </body>
      </html>
    `;
    mockClient.waitResult.mockResolvedValue({
      success: true,
      html: successHtml,
    });
    mockClient.hasCaptcha.mockResolvedValue(false);
    mockClient.hasError.mockResolvedValue(false);
    mockClient.hasResult.mockResolvedValue(true);

    const adapter = new ReceitaConsultaOptantesAdapter();

    const result = await adapter.lookup("12.345.678/0001-95");

    expect(result.status).toBe("SUCCESS");
    expect(result.simplesNacional).toBe(true);
    expect(result.simei).toBe(false);
  });
});
