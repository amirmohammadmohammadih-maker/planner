// Prepares the Capacitor (Android/iOS) project inputs in the PROJECT ROOT:
//   www/                   the static mobile build of the app (works fully offline, data on the device)
//   capacitor.config.json
//   assets/                icon & splash sources for `npx capacitor-assets generate`
// Usage (from project root):  node packaging/capacitor/prepare.js [--skip-build]
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const src = __dirname;
const exportDir = path.join(root, ".next-mobile");
const skipBuild = process.argv.includes("--skip-build");

if (!skipBuild) {
  console.log("prepare: building the mobile app (static export)…");
  const r = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", ["next", "build"], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, PLANNER_TARGET: "mobile", NEXT_TELEMETRY_DISABLED: "1" },
  });
  if (r.status !== 0) {
    console.error("prepare: build failed");
    process.exit(r.status ?? 1);
  }
}
if (!fs.existsSync(path.join(exportDir, "index.html"))) {
  console.error(`prepare: ${exportDir}/index.html not found — run without --skip-build`);
  process.exit(1);
}

const www = path.join(root, "www");
fs.rmSync(www, { recursive: true, force: true });
fs.cpSync(exportDir, www, { recursive: true });
// not needed inside the app shell
for (const f of ["sw.js", "offline.html"]) fs.rmSync(path.join(www, f), { force: true });

// PGlite (in-browser PostgreSQL) runtime, served unbundled from /pglite/ (see src/local/db.ts)
const pgliteDist = path.dirname(require.resolve("@electric-sql/pglite", { paths: [root] }));
const pgliteOut = path.join(www, "pglite");
fs.mkdirSync(pgliteOut, { recursive: true });
for (const f of fs.readdirSync(pgliteDist)) {
  if (/^(index\.js|chunk-.*\.js|initdb\.js|pglite\.js|.*\.wasm|.*\.data)$/.test(f)) fs.copyFileSync(path.join(pgliteDist, f), path.join(pgliteOut, f));
}
fs.cpSync(path.join(pgliteDist, "fs"), path.join(pgliteOut, "fs"), { recursive: true });

fs.copyFileSync(path.join(src, "capacitor.config.json"), path.join(root, "capacitor.config.json"));

const assets = path.join(root, "assets");
fs.mkdirSync(assets, { recursive: true });
for (const f of fs.readdirSync(path.join(src, "assets"))) fs.copyFileSync(path.join(src, "assets", f), path.join(assets, f));

function size(dir) {
  let total = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    total += e.isDirectory() ? size(p) : fs.statSync(p).size;
  }
  return total;
}
console.log(`prepare: www/ (${(size(www) / 1024 / 1024).toFixed(1)} MB), capacitor.config.json and assets/ are ready.`);
