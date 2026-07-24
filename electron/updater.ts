import { autoUpdater } from "electron-updater";
import type { BrowserWindow } from "electron";

export function initAutoUpdater(mainWindow: BrowserWindow): void {
  // ── Configuration ──
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // ── Events ──

  autoUpdater.on("checking-for-update", () => {
    mainWindow.webContents.send("update:status", "checking");
  });

  autoUpdater.on("update-available", (info) => {
    mainWindow.webContents.send("update:available", {
      version: info.version,
    });
    // autoDownload = true, so download starts automatically
  });

  autoUpdater.on("update-not-available", () => {
    mainWindow.webContents.send("update:status", "up-to-date");
  });

  autoUpdater.on("download-progress", (progress) => {
    mainWindow.webContents.send("update:download-progress", {
      percent: Math.round(progress.percent),
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    mainWindow.webContents.send("update:downloaded", {
      version: info.version,
    });
  });

  autoUpdater.on("error", (err) => {
    mainWindow.webContents.send("update:error", err.message);
  });

  // ── Start periodic checks ──
  // Delay initial check so the window is fully loaded
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      // Silently ignore — not critical on startup
    });
  }, 10_000);

  // Check every 6 hours
  setInterval(
    () => {
      autoUpdater.checkForUpdates().catch(() => {});
    },
    6 * 60 * 60 * 1000,
  );
}

export function installUpdateAndRestart(): void {
  autoUpdater.quitAndInstall();
}
