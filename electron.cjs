const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");

const isDev = !app.isPackaged;
const WINDOW_TITLE = "Code Release Tracker";
const MIN_SPLASH_DURATION_MS = 4500;
const SPLASH_CLOSE_FADE_MS = 280;
const SPLASH_HTML = path.join(__dirname, "splash.html");
const WINDOW_ICON = path.join(
  __dirname,
  "src",
  "assets",
  process.platform === "win32" ? "codeReleaseTrackerLogo.ico" : "codeReleaseTrackerLogo.png",
);

app.setName(WINDOW_TITLE);

let manualUpdateCheckRequested = false;

function setupAutoUpdater() {
  if (process.platform !== "win32" || !app.isPackaged) {
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    console.log(`Update available: ${info.version}`);
  });

  autoUpdater.on("update-not-available", (info) => {
    console.log(`No update available: ${info.version}`);
    if (manualUpdateCheckRequested) {
      manualUpdateCheckRequested = false;
      dialog.showMessageBox({
        type: "info",
        buttons: ["OK"],
        defaultId: 0,
        title: WINDOW_TITLE,
        message: "You are already on the latest version.",
      });
    }
  });

  autoUpdater.on("error", (error) => {
    console.error("Auto-update error:", error);
  });

  autoUpdater.on("update-downloaded", async (info) => {
    const result = await dialog.showMessageBox({
      type: "info",
      buttons: ["Restart now", "Later"],
      defaultId: 0,
      cancelId: 1,
      title: WINDOW_TITLE,
      message: "A new version of Code Release Tracker is ready to install.",
      detail: `Version ${info.version} has been downloaded. Restart now to finish installing the update.`,
    });

    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.checkForUpdates().catch((error) => {
    console.error("Failed to check for updates:", error);
  });
}

async function checkForUpdates(manual = false) {
  if (process.platform !== "win32" || !app.isPackaged) {
    if (manual) {
      await dialog.showMessageBox({
        type: "info",
        buttons: ["OK"],
        defaultId: 0,
        title: WINDOW_TITLE,
        message: "Update checks are only available in the packaged Windows app.",
      });
    }
    return { ok: false };
  }

  if (manual) {
    manualUpdateCheckRequested = true;
  }

  try {
    await autoUpdater.checkForUpdates();
    return { ok: true };
  } catch (error) {
    console.error("Failed to check for updates:", error);
    if (manual) {
      manualUpdateCheckRequested = false;
      await dialog.showMessageBox({
        type: "error",
        buttons: ["OK"],
        defaultId: 0,
        title: WINDOW_TITLE,
        message: "Unable to check for updates right now.",
        detail: error instanceof Error ? error.message : "Unknown updater error.",
      });
    }
    return { ok: false };
  }
}

function createSplashWindow() {
  const splash = new BrowserWindow({
    width: 760,
    height: 440,
    frame: false,
    resizable: false,
    movable: true,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    show: true,
    skipTaskbar: true,
    backgroundColor: "#040611",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
    },
  });

  splash.setMenuBarVisibility(false);
  splash.loadFile(SPLASH_HTML);

  return splash;
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1180,
    minHeight: 760,
    title: WINDOW_TITLE,
    icon: WINDOW_ICON,
    backgroundColor: "#05060f",
    frame: false,
    titleBarStyle: "hidden",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  window.on("page-title-updated", (event) => {
    event.preventDefault();
    window.setTitle(WINDOW_TITLE);
  });

  window.on("maximize", () => {
    window.webContents.send("window:maximized-changed", true);
  });

  window.on("unmaximize", () => {
    window.webContents.send("window:maximized-changed", false);
  });

  if (isDev) {
    window.loadURL("http://localhost:5173");
  } else {
    window.loadFile(path.join(__dirname, "dist", "index.html"));
  }

  window.setTitle(WINDOW_TITLE);

  return window;
}

function launchApplicationWindow() {
  const splashWindow = createSplashWindow();
  const mainWindow = createWindow();
  const splashStart = Date.now();

  mainWindow.once("ready-to-show", () => {
    const elapsed = Date.now() - splashStart;
    const remaining = Math.max(0, MIN_SPLASH_DURATION_MS - elapsed);

    setTimeout(() => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.show();
      }
      if (!splashWindow.isDestroyed()) {
        splashWindow.webContents.executeJavaScript(
          'document.body.classList.add("is-closing")',
          true,
        );
        setTimeout(() => {
          if (!splashWindow.isDestroyed()) {
            splashWindow.close();
          }
        }, SPLASH_CLOSE_FADE_MS);
      }
    }, remaining);
  });

  return mainWindow;
}

app.whenReady().then(() => {
  ipcMain.handle("app:check-for-updates", async () => {
    return checkForUpdates(true);
  });

  ipcMain.on("window:minimize", (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.on("window:maximize", (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return;

    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  });

  ipcMain.on("window:close", (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });

  launchApplicationWindow();
  setupAutoUpdater();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      launchApplicationWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
