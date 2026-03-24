export type AutoSaveFn = (
  sourceFilePath: string,
  content: string,
) => Promise<string>;

export type AutoSaveAttemptResult = {
  savedPath: string | null;
  warningMessage: string | null;
};

export async function attemptAutoSave(
  autoSave: AutoSaveFn,
  sourceFilePath: string | null,
  content: string,
): Promise<AutoSaveAttemptResult> {
  if (!sourceFilePath) {
    return {
      savedPath: null,
      warningMessage: null,
    };
  }

  try {
    const savedPath = await autoSave(sourceFilePath, content);

    return {
      savedPath,
      warningMessage: null,
    };
  } catch (error) {
    return {
      savedPath: null,
      warningMessage:
        error instanceof Error && error.message.trim()
          ? `Processamento concluído, mas o auto-save falhou: ${error.message}`
          : "Processamento concluído, mas o auto-save falhou.",
    };
  }
}
