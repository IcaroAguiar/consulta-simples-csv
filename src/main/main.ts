import path from "node:path";
import { app, BrowserWindow, dialog } from "electron";

import { closeWindowAfterCancellation } from "./close-after-cancel";
import {
  hasActiveProcessing,
  onProcessingCompleted,
  registerCsvIpc,
  requestProcessingCancel,
} from "./ipc/process-csv.ipc";

const DEV_SERVER_URL = "http://localhost:5173";

let mainWindow: BrowserWindow | null = null;

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1240,
    height: 860,
    minWidth: 980,
    minHeight: 720,
    backgroundColor: "#0f172a",
    title: "Consulta Simples CSV",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (app.isPackaged) {
    window.loadFile(path.join(app.getAppPath(), "dist", "index.html"));
  } else {
    window.loadURL(DEV_SERVER_URL);
    window.webContents.openDevTools({ mode: "detach" });
  }

  let allowClose = false;
  let pendingCloseUnsubscribe: (() => void) | null = null;

  window.on("close", async (event) => {
    if (allowClose || !hasActiveProcessing()) {
      return;
    }

    event.preventDefault();

    const response = await dialog.showMessageBox(window, {
      type: "warning",
      buttons: ["Continuar processando", "Cancelar e fechar"],
      defaultId: 0,
      cancelId: 0,
      title: "Processamento em andamento",
      message:
        "Existe um processamento em andamento. Cancelar e fechar salva o resultado parcial quando o job atual terminar.",
    });

    if (response.response !== 1) {
      return;
    }

    pendingCloseUnsubscribe?.();
    closeWindowAfterCancellation({
      requestCancel: requestProcessingCancel,
      onCompleted(listener) {
        pendingCloseUnsubscribe = onProcessingCompleted(() => {
          pendingCloseUnsubscribe?.();
          pendingCloseUnsubscribe = null;
          listener();
        });

        return () => {
          pendingCloseUnsubscribe?.();
          pendingCloseUnsubscribe = null;
        };
      },
      closeWindow() {
        allowClose = true;
        if (!window.isDestroyed()) {
          window.close();
        }
      },
    });
  });

  return window;
}

async function bootstrap(): Promise<void> {
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
    return;
  }

  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  await app.whenReady();
  registerCsvIpc();
  mainWindow = createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    }
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

void bootstrap();
