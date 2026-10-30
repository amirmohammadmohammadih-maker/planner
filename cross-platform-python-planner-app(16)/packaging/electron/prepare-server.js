// Assembles the self-contained server folder (packaging/electron/server) from the Next.js build:
//   .next/standalone  (server.js + minimal node_modules)  +  .next/static  +  public
// Run from the project root AFTER `npm run build`:  node packaging/electron/prepare-server.js
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const standalone = path.join(root, ".next", "standalone");
const out = path.join(__dirname, "server");

if (!fs.existsSync(path.join(standalone, "server.js"))) {
  console.error("prepare-server: .next/standalone not found. Run `npm run build` in the project root first.");
  process.exit(1);
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.cpSync(standalone, out, { recursive: true, dereference: true });
fs.cpSync(path.join(root, ".next", "static"), path.join(out, ".next", "static"), { recursive: true });
if (fs.existsSync(path.join(root, "public"))) fs.cpSync(path.join(root, "public"), path.join(out, "public"), { recursive: true });

// Trim things the desktop app never needs (keeps the installer smaller).
const trim = [
  "node_modules/sharp",
  "node_modules/@img",
  "node_modules/.cache",
];
for (const rel of trim) fs.rmSync(path.join(out, rel), { recursive: true, force: true });
// Remove the macOS/linux-only pglite extension tarballs? No — pglite needs them lazily; keep.

function size(dir) {
  let total = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    total += e.isDirectory() ? size(p) : fs.statSync(p).size;
  }
  return total;
}
console.log(`prepare-server: ready at ${out} (${(size(out) / 1024 / 1024).toFixed(1)} MB)`);
