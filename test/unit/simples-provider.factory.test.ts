import { describe, expect, it, vi } from "vitest";
import { CnpjaOpenSimplesLookupAdapter } from "../../src/core/simples/adapters/cnpja-open-simples-lookup.adapter";
import { MockSimplesLookupAdapter } from "../../src/core/simples/adapters/mock-simples-lookup.adapter";
import { ReceitaConsultaOptantesAdapter } from "../../src/core/simples/adapters/receita-web/receita-consulta-optantes.adapter";
import type { SimplesLookupPort } from "../../src/core/simples/simples-lookup.port";
import { createSimplesLookupProvider } from "../../src/core/simples/simples-provider.factory";

vi.mock("../../src/core/simples/adapters/mock-simples-lookup.adapter", () => ({
  MockSimplesLookupAdapter: vi.fn(),
}));

vi.mock(
  "../../src/core/simples/adapters/cnpja-open-simples-lookup.adapter",
  () => ({
    CnpjaOpenSimplesLookupAdapter: vi.fn(),
  }),
);

vi.mock(
  "../../src/core/simples/adapters/receita-web/receita-consulta-optantes.adapter",
  () => ({
    ReceitaConsultaOptantesAdapter: vi.fn(),
  }),
);

const MockSimplesLookupAdapterMock = vi.mocked(MockSimplesLookupAdapter);
const CnpjaOpenSimplesLookupAdapterMock = vi.mocked(
  CnpjaOpenSimplesLookupAdapter,
);
const ReceitaConsultaOptantesAdapterMock = vi.mocked(
  ReceitaConsultaOptantesAdapter,
);

function createMockAdapter(): SimplesLookupPort {
  return { lookup: vi.fn() };
}

describe("createSimplesLookupProvider", () => {
  it("returns MockSimplesLookupAdapter for mock provider", () => {
    const mockInstance = createMockAdapter();
    MockSimplesLookupAdapterMock.mockImplementation(
      () => mockInstance as unknown as MockSimplesLookupAdapter,
    );

    const result = createSimplesLookupProvider("mock");

    expect(MockSimplesLookupAdapter).toHaveBeenCalled();
    expect(result).toBe(mockInstance);
  });

  it("returns CnpjaOpenSimplesLookupAdapter for cnpja-open provider", () => {
    const cnpjaInstance = createMockAdapter();
    CnpjaOpenSimplesLookupAdapterMock.mockImplementation(
      () => cnpjaInstance as unknown as CnpjaOpenSimplesLookupAdapter,
    );

    const result = createSimplesLookupProvider("cnpja-open");

    expect(CnpjaOpenSimplesLookupAdapter).toHaveBeenCalled();
    expect(result).toBe(cnpjaInstance);
  });

  it("returns ReceitaConsultaOptantesAdapter for receita-web provider", () => {
    const receitaInstance = createMockAdapter();
    ReceitaConsultaOptantesAdapterMock.mockImplementation(
      () => receitaInstance as unknown as ReceitaConsultaOptantesAdapter,
    );

    const result = createSimplesLookupProvider("receita-web");

    expect(ReceitaConsultaOptantesAdapter).toHaveBeenCalled();
    expect(result).toBe(receitaInstance);
  });
});
