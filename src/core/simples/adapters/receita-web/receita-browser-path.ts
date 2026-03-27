import { existsSync } from "node:fs";
import path from "node:path";

const WINDOWS_BROWSER_CANDIDATES = [
  ["LOCALAPPDATA", "Google", "Chrome", "Application", "chrome.exe"],
  ["PROGRAMFILES", "Google", "Chrome", "Application", "chrome.exe"],
  ["PROGRAMFILES(X86)", "Google", "Chrome", "Application", "chrome.exe"],
  ["LOCALAPPDATA", "Chromium", "Application", "chrome.exe"],
  ["PROGRAMFILES", "Microsoft", "Edge", "Application", "msedge.exe"],
  ["PROGRAMFILES(X86)", "Microsoft", "Edge", "Application", "msedge.exe"],
] as const;

function fromEnvPath(
  envName: string,
  ...segments: readonly string[]
): string | null {
  const basePath = process.env[envName];
  if (!basePath) {
    return null;
  }

  return path.win32.join(basePath, ...segments);
}

export function resolvePackagedWindowsBrowserPath(): string | undefined {
  if (process.platform !== "win32") {
    return undefined;
  }

  for (const [envName, ...segments] of WINDOWS_BROWSER_CANDIDATES) {
    const candidate = fromEnvPath(envName, ...segments);
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}
