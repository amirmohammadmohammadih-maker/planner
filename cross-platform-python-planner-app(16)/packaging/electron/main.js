// Planner desktop app.
//
// Two modes (switch any time with Ctrl + , inside the app):
//   • "local"  (default) — starts the bundled Next.js server with an embedded database
//                          (PGlite) from the app's resources. No Docker, no install, works offline.
//                          Data lives in  %APPDATA%\planner-desktop\data
//   • "remote"           — just opens a server you run elsewhere (https://your-domain.com).
//
// Settings file:  %APPDATA%\planner-desktop\settings.json   { "mode": "local" | "remote", "url": "..." }
const { app, BrowserWindow, shell, Menu, ipcMain, dialog } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");

const APP_NAME = "پلنر جامع";
const DEFAULT_REMOTE = "http://localhost:3000";

/* ------------------------------------------------------------------ */
/* settings                                                           */
/* ------------------------------------------------------------------ */
function userDir() {
  return app.getPath("userData");
}
function settingsFile() {
  return path.join(userDir(), "settings.json");
}
function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}
function loadSettings() {
  const s = readJson(settingsFile()) || {};
  const bundled = readJson(path.join(__dirname, "config.json")) || {};
  return {
    mode: s.mode === "remote" ? "remote" : "local",
    url: (s.url || bundled.url || DEFAULT_REMOTE).replace(/\/+$/, ""),
    lan: s.lan === true, // expose the embedded server on the home network (for the phone app)
    lanPort: Number.isInteger(s.lanPort) && s.lanPort > 0 && s.lanPort < 65536 ? s.lanPort : 3000,
  };
}
function saveSettings(patch) {
  const next = { ...loadSettings(), ...patch };
  fs.mkdirSync(userDir(), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(next, null, 2));
  return next;
}

/* ------------------------------------------------------------------ */
/* embedded server                                                    */
/* ------------------------------------------------------------------ */
let serverProc = null;
let localUrl = null;
const logFile = () => path.join(userDir(), "server.log");

function serverDir() {
  // In a packaged app the server lives in resources/server (extraResources); in dev it's the symlinked/copied folder.
  return app.isPackaged ? path.join(process.resourcesPath, "server") : path.join(__dirname, "server");
}

function lanAddresses(port) {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const i of list || []) {
      if (i.family !== "IPv4" || i.internal || i.address.startsWith("169.254.")) continue;
      if (/vEthernet|WSL|Docker|VirtualBox|VMware|Loopback/i.test(name)) continue;
      out.push(`http://${i.address}:${port}`);
    }
  }
  return out;
}

function portAvailable(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.unref();
    srv.once("error", () => resolve(false));
    srv.listen(port, "0.0.0.0", () => srv.close(() => resolve(true)));
  });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function waitForHealth(url, timeoutMs, proc) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      fetch(`${url}/api/health`)
        .then((r) => (r.ok ? resolve(true) : retry()))
        .catch(retry);
    };
    const retry = () => {
      if (proc && proc.exitCode !== null) return reject(new Error(`server exited with code ${proc.exitCode} — see the log file`));
      if (Date.now() - started > timeoutMs) return reject(new Error("server did not start in time"));
      setTimeout(tick, 300);
    };
    tick();
  });
}

async function startLocalServer() {
  if (localUrl) return localUrl;
  const dir = serverDir();
  const entry = path.join(dir, "server.js");
  if (!fs.existsSync(entry)) throw new Error(`Bundled server not found at ${entry}`);

  const dataDir = path.join(userDir(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const s = loadSettings();
  let port;
  if (s.lan) {
    if (!(await portAvailable(s.lanPort))) {
      throw new Error(`پورت ${s.lanPort} در حال استفاده است (شاید Docker یا برنامه‌ی دیگری روشن است). پورت دیگری انتخاب کن یا دسترسی شبکه را خاموش کن.`);
    }
    port = s.lanPort;
  } else {
    port = await freePort();
  }
  const host = s.lan ? "0.0.0.0" : "127.0.0.1";
  const url = `http://127.0.0.1:${port}`;

  const log = fs.openSync(logFile(), "a");
  fs.writeSync(log, `\n[${new Date().toISOString()}] starting server on ${host}:${port} (lan=${s.lan})\n`);

  // Run the Next.js standalone server with Electron's built-in Node (ELECTRON_RUN_AS_NODE).
  serverProc = spawn(process.execPath, [entry], {
    cwd: dir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: host,
      DATABASE_URL: `pglite://${dataDir}`,
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: ["ignore", log, log],
    windowsHide: true,
  });
  const proc = serverProc;
  proc.on("exit", (code) => {
    try {
      fs.writeSync(log, `[${new Date().toISOString()}] server exited (${code})\n`);
      fs.closeSync(log);
    } catch {
      /* ignore */
    }
    if (serverProc === proc) {
      serverProc = null;
      localUrl = null;
    }
  });

  try {
    await waitForHealth(url, 60_000, proc);
  } catch (e) {
    try {
      proc.kill();
    } catch {
      /* ignore */
    }
    throw e;
  }
  localUrl = url;
  return url;
}

function stopLocalServer() {
  if (serverProc) {
    try {
      serverProc.kill();
    } catch {
      /* ignore */
    }
    serverProc = null;
    localUrl = null;
  }
}

/* ------------------------------------------------------------------ */
/* window                                                             */
/* ------------------------------------------------------------------ */
let win = null;
let currentUrl = "";

function showSettings(message) {
  const s = loadSettings();
  win.loadFile(path.join(__dirname, "settings.html"), { query: { mode: s.mode, url: s.url, m: message || "" } });
}
function showSplash(text) {
  win.loadFile(path.join(__dirname, "splash.html"), { query: { t: text || "" } });
}

async function openApp() {
  const s = loadSettings();
  try {
    if (s.mode === "local") {
      showSplash("در حال راه‌اندازی…");
      currentUrl = await startLocalServer();
    } else {
      currentUrl = s.url;
    }
    await win.loadURL(currentUrl);
  } catch (e) {
    showSettings(`راه‌اندازی ناموفق بود: ${e.message}`);
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 380,
    minHeight: 600,
    title: APP_NAME,
    icon: path.join(__dirname, "icon.png"),
    autoHideMenuBar: true,
    backgroundColor: "#f6f8f4",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  Menu.setApplicationMenu(null);
  win.once("ready-to-show", () => win.show());

  // Links to other sites open in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!currentUrl || !url.startsWith(currentUrl)) shell.openExternal(url);
    return { action: "deny" };
  });

  // Server unreachable (remote mode) → settings page. -3 = aborted navigation, ignore.
  win.webContents.on("did-fail-load", (_e, code, desc, url, isMainFrame) => {
    if (isMainFrame && code !== -3 && !url.startsWith("file:")) showSettings(`اتصال به ${url} برقرار نشد (${desc})`);
  });

  // Ctrl+,  → settings   |   F5 → reload   |   Ctrl+Shift+I → devtools
  win.webContents.on("before-input-event", (_e, input) => {
    if (input.type !== "keyDown") return;
    if (input.control && input.key === ",") showSettings("");
    if (input.key === "F5" && currentUrl) win.loadURL(currentUrl);
    if (input.control && input.shift && input.key.toLowerCase() === "i") win.webContents.toggleDevTools();
  });

  openApp();
}

/* ------------------------------------------------------------------ */
/* IPC (settings page)                                                */
/* ------------------------------------------------------------------ */
/** Restart the embedded server in place (settings page stays open). */
async function restartLocalServer() {
  stopLocalServer();
  await new Promise((r) => setTimeout(r, 400));
  currentUrl = await startLocalServer();
  return currentUrl;
}

ipcMain.handle("planner:get-settings", () => {
  const s = loadSettings();
  return {
    ...s,
    dataDir: path.join(userDir(), "data"),
    logFile: logFile(),
    version: app.getVersion(),
    lanAddresses: lanAddresses(s.lanPort),
    serverRunning: !!localUrl,
  };
});
ipcMain.handle("planner:set-lan", async (_e, opts) => {
  const lan = !!(opts && opts.lan);
  const lanPort = Number(opts && opts.lanPort);
  if (lan && !(Number.isInteger(lanPort) && lanPort >= 1024 && lanPort < 65536)) return { ok: false, error: "پورت باید عددی بین ۱۰۲۴ و ۶۵۵۳۵ باشد" };
  saveSettings({ mode: "local", lan, ...(lan ? { lanPort } : {}) });
  try {
    await restartLocalServer();
  } catch (e) {
    saveSettings({ lan: false });
    return { ok: false, error: e.message };
  }
  return { ok: true, addresses: lan ? lanAddresses(lanPort) : [] };
});
ipcMain.handle("planner:use-local", () => {
  saveSettings({ mode: "local" });
  openApp();
  return { ok: true };
});
ipcMain.handle("planner:open-firewall-help", () => shell.openExternal("https://support.microsoft.com/windows/firewall"));
ipcMain.handle("planner:use-remote", (_e, url) => {
  const clean = String(url || "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\/[^\s/]+/.test(clean)) return { ok: false, error: "آدرس باید با http:// یا https:// شروع شود" };
  saveSettings({ mode: "remote", url: clean });
  openApp();
  return { ok: true };
});
ipcMain.handle("planner:open-data-folder", () => shell.openPath(path.join(userDir(), "data")));
ipcMain.handle("planner:open-log", () => shell.openPath(logFile()));
ipcMain.handle("planner:back", () => {
  if (currentUrl) win.loadURL(currentUrl);
  else openApp();
});

/* ------------------------------------------------------------------ */
/* lifecycle                                                          */
/* ------------------------------------------------------------------ */
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(() => {
    createWindow();
    app.on("activate", () => BrowserWindow.getAllWindows().length === 0 && createWindow());
  });
}
app.on("window-all-closed", () => {
  stopLocalServer();
  if (process.platform !== "darwin") app.quit();
});
app.on("before-quit", stopLocalServer);
process.on("uncaughtException", (e) => {
  try {
    fs.appendFileSync(logFile(), `[${new Date().toISOString()}] uncaught: ${e.stack || e}\n`);
  } catch {
    /* ignore */
  }
  dialog.showErrorBox(APP_NAME, String(e.message || e));
});
