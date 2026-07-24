import { app, BrowserWindow, dialog, session } from "electron";
import path from "node:path";
import { initDatabase, closeDatabase } from "./db";
import { registerIpc } from "./ipc";
import { removeSession } from "./auth";
import { initAutoUpdater } from "./updater";

const isDev = !app.isPackaged;
let isQuitting = false;

app.on("before-quit", () => {
  isQuitting = true;
});

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1100,
    minHeight: 700,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Clean up session when the window is closed
  const wcId = win.webContents.id;
  win.on("closed", () => {
    removeSession(wcId);
  });

  // Also clean up session if webContents is destroyed
  win.webContents.on("destroyed", () => {
    removeSession(wcId);
  });

  // Navigation restriction: only allow expected URLs
  win.webContents.on("will-navigate", (event, url) => {
    const allowed = isDev ? url.startsWith("http://localhost:5273") : url.startsWith("file://");
    if (!allowed) event.preventDefault();
  });

  // Deny window.open calls from the renderer
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  // Deny all permission requests (notifications, media, etc.)
  win.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  if (isDev) {
    void win.loadURL("http://localhost:5273");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    void win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Confirm before closing (skip if app is quitting)
  win.on("close", async (event) => {
    if (isQuitting) return;
    event.preventDefault();
    const { response } = await dialog.showMessageBox(win, {
      type: "question",
      buttons: ["Ya, Keluar", "Batal"],
      defaultId: 1,
      title: "Konfirmasi Keluar",
      message: "Apakah Anda yakin ingin keluar dari aplikasi?",
    });
    if (response === 0) {
      win.destroy();
    }
  });

  return win;
}

app
  .whenReady()
  .then(() => {
    // frame-ancestors must be delivered via HTTP header, not <meta>
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": ["frame-ancestors 'none'"],
        },
      });
    });

    try {
      initDatabase(app.getPath("userData"));
      registerIpc();
      const win = createWindow();
      initAutoUpdater(win);

      app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow();
        }
      });
    } catch (err) {
      console.error("Failed to initialize application:", err);
      app.quit();
    }
  })
  .catch((err) => {
    console.error("Fatal error during startup:", err);
    app.quit();
  });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  closeDatabase();
});
