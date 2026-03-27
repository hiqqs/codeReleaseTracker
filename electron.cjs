const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const { pathToFileURL } = require("url");

const isDev = !app.isPackaged;
const WINDOW_TITLE = "Code Release Tracker";
const MIN_SPLASH_DURATION_MS = 2000;
const SPLASH_IMAGE = path.join(__dirname, "src", "assets", "codeReleaseTrackerBg.png");
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
  const splashImageUrl = pathToFileURL(SPLASH_IMAGE).href;
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
  splash.loadURL(
    `data:text/html;charset=UTF-8,${encodeURIComponent(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${WINDOW_TITLE}</title>
          <style>
            :root {
              color-scheme: dark;
              font-family: "Segoe UI", system-ui, sans-serif;
            }

            html, body {
              width: 100%;
              height: 100%;
              margin: 0;
            }

            body {
              display: grid;
              place-items: center;
              background:
                linear-gradient(180deg, rgba(4, 6, 17, 0.18), rgba(4, 6, 17, 0.82)),
                url("${splashImageUrl}") center/cover no-repeat;
              overflow: hidden;
              opacity: 0;
              transform: scale(1.01);
              transition: opacity 240ms ease, transform 240ms ease;
            }

            body.is-visible {
              opacity: 1;
              transform: scale(1);
            }

            body.is-closing {
              opacity: 0;
              transform: scale(0.99);
            }

            .panel {
              display: grid;
              gap: 12px;
              justify-items: center;
              padding: 18px 22px;
              border: 1px solid rgba(255, 255, 255, 0.14);
              border-radius: 18px;
              background: rgba(5, 6, 15, 0.58);
              box-shadow: 0 20px 80px rgba(0, 0, 0, 0.45);
              backdrop-filter: blur(10px);
            }

            .title {
              margin: 0;
              font-size: 18px;
              font-weight: 700;
              letter-spacing: 0.06em;
              text-transform: uppercase;
            }

            .subtitle {
              margin: 0;
              color: rgba(248, 250, 252, 0.76);
              font-size: 13px;
            }

            .status {
              margin: 0;
              color: rgba(248, 250, 252, 0.62);
              font-size: 12px;
              letter-spacing: 0.03em;
              text-transform: uppercase;
            }

            .spinner {
              width: 22px;
              height: 22px;
              border: 2px solid rgba(248, 250, 252, 0.22);
              border-top-color: #f8fafc;
              border-radius: 50%;
              animation: spin 0.9s linear infinite;
            }

            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }
          </style>
        </head>
        <body>
          <div class="panel" aria-label="Loading Code Release Tracker">
            <div class="spinner" aria-hidden="true"></div>
            <p class="title">Code Release Tracker</p>
            <p class="subtitle">Loading releases and workspace state...</p>
            <p class="status" id="splash-status">Checking for updates...</p>
          </div>
          <script>
            const status = document.getElementById("splash-status");
            const statuses = [
              "Checking for updates...",
              "Loading release data...",
              "Preparing workspace...",
            ];

            let statusIndex = 0;
            const rotateStatus = () => {
              statusIndex = Math.min(statusIndex + 1, statuses.length - 1);
              if (status) {
                status.textContent = statuses[statusIndex];
              }
            };

            requestAnimationFrame(() => {
              document.body.classList.add("is-visible");
            });

            setTimeout(rotateStatus, 650);
            setTimeout(rotateStatus, 1300);
          </script>
        </body>
      </html>
    `)}`,
  );

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
        }, 240);
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
