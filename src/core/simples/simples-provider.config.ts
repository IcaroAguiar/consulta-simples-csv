import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SimplesProviderName } from "./simples-provider.factory";

const CONFIG_FILE_NAME = "simples-provider.config.json";
const ENV_VAR_NAME = "SIMPLES_PROVIDER";
const DEFAULT_PROVIDER: SimplesProviderName = "mock";

const VALID_PROVIDERS: readonly SimplesProviderName[] = [
  "mock",
  "cnpja-open",
  "receita-web",
] as const;

function isValidProvider(value: unknown): value is SimplesProviderName {
  return (
    typeof value === "string" &&
    VALID_PROVIDERS.includes(value as SimplesProviderName)
  );
}

function readConfigFile(): SimplesProviderName | null {
  const configPath = resolve(process.cwd(), CONFIG_FILE_NAME);

  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const config = JSON.parse(content) as { provider?: unknown };

    if (isValidProvider(config.provider)) {
      return config.provider;
    }

    return null;
  } catch {
    return null;
  }
}

function readEnvVar(): SimplesProviderName | null {
  const envValue = process.env[ENV_VAR_NAME];

  if (isValidProvider(envValue)) {
    return envValue;
  }

  return null;
}

export function loadProviderConfig(): SimplesProviderName {
  const fileProvider = readConfigFile();
  if (fileProvider !== null) {
    return fileProvider;
  }

  const envProvider = readEnvVar();
  if (envProvider !== null) {
    return envProvider;
  }

  return DEFAULT_PROVIDER;
}
