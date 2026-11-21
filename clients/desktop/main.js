const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

let mainWindow = null;

function configPath() {
  return path.join(app.getPath("userData"), "taoguan-server-config.json");
}

function readConfig() {
  try {
    const raw = fs.readFileSync(configPath(), "utf8");
    const parsed = JSON.parse(raw);
    return {
      serverUrl: typeof parsed.serverUrl === "string" ? parsed.serverUrl : "",
      recentUrls: Array.isArray(parsed.recentUrls) ? parsed.recentUrls : []
    };
  } catch {
    return { serverUrl: "", recentUrls: [] };
  }
}

function saveConfig(serverUrl) {
  const clean = String(serverUrl || "").trim().replace(/\/+$/, "");
  const cur = readConfig();
  const recent = [clean, ...cur.recentUrls.filter((u) => u && u !== clean)].slice(0, 6);
  const next = { serverUrl: clean, recentUrls: recent };
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(next, null, 2), "utf8");
  return next;
}

function openLauncher() {
  if (!mainWindow) return;
  mainWindow.loadFile(path.join(__dirname, "launcher.html"));
}

function connectServer(url) {
  if (!mainWindow || !url) return;
  mainWindow.loadURL(url);
}

function buildMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    {
      label: "韬冠系统",
      submenu: [
        { label: "返回首页工作台", accelerator: "CmdOrCtrl+H", click: () => { const cfg = readConfig(); if (cfg.serverUrl) connectServer(cfg.serverUrl); else openLauncher(); } },
        { label: "切换公网 / 内网服务器地址", accelerator: "CmdOrCtrl+Shift+S", click: () => openLauncher() },
        { type: "separator" },
        { label: "打印当前文书 / 表单", accelerator: "CmdOrCtrl+P", click: () => mainWindow?.webContents.print({ silent: false, printBackground: true }) },
        { label: "刷新页面", role: "reload" },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit", label: "退出韬冠律所" }
      ]
    },
    {
      label: "编辑",
      submenu: [
        { role: "undo", label: "撤销" },
        { role: "redo", label: "重做" },
        { type: "separator" },
        { role: "cut", label: "剪切" },
        { role: "copy", label: "复制" },
        { role: "paste", label: "粘贴" },
        { role: "selectAll", label: "全选" }
      ]
    },
    {
      label: "视图",
      submenu: [
        { role: "zoomIn", label: "放大" },
        { role: "zoomOut", label: "缩小" },
        { role: "resetZoom", label: "重置缩放" },
        { type: "separator" },
        { role: "togglefullscreen", label: "全屏模式" },
        { role: "toggleDevTools", label: "开发者调试工具" }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 880,
    minWidth: 1024,
    minHeight: 680,
    title: "韬冠律所 — 全流程综合管理系统",
    icon: path.join(__dirname, "assets", process.platform === "win32" ? "icon.ico" : "icon.png"),
    backgroundColor: "#0F2537",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const cfg = readConfig();
      if (cfg.serverUrl && url.startsWith(cfg.serverUrl)) {
        return { action: "allow" };
      }
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("did-fail-load", (_ev, code, desc, url) => {
    if (url && !url.startsWith("file://")) {
      dialog.showMessageBox(mainWindow, {
        type: "warning",
        title: "服务器连接失败",
        message: `无法连接到韬冠律所服务端：${url}`,
        detail: `错误原因：${desc} (${code})\n将返回服务器配置向导，请检查公网地址或网络状态。`
      });
      openLauncher();
    }
  });

  const cfg = readConfig();
  if (cfg.serverUrl) {
    connectServer(cfg.serverUrl);
  } else {
    openLauncher();
  }
}

ipcMain.handle("taoguan:get-config", () => readConfig());
ipcMain.handle("taoguan:check-health", async (_ev, rawUrl) => {
  const clean = String(rawUrl || "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(clean)) {
    return { ok: false, error: "请输入以 https:// 或 http:// 开头的完整公网或局域网地址" };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${clean}/api/health`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, error: `服务响应异常 HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, url: clean, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "无法连接到服务器" };
  }
});
ipcMain.handle("taoguan:connect", (_ev, rawUrl) => {
  const next = saveConfig(rawUrl);
  connectServer(next.serverUrl);
  return next;
});

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
