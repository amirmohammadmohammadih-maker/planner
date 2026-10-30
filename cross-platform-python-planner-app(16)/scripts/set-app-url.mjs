#!/usr/bin/env node
/* یک‌بار اجرا کن تا آدرس سرور در همه‌ی کانفیگ‌های بسته‌بندی (اندروید/ویندوز) نوشته شود:
     node scripts/set-app-url.mjs https://your-domain.com
   آدرس http (مثلاً http://192.168.1.10:3000) فقط برای تست محلی است. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = (process.argv[2] || "").trim().replace(/\/+$/, "");

if (!/^https?:\/\/[^\s/]+(\/.*)?$/.test(url)) {
  console.error("❌ آدرس معتبر نیست.\n   استفاده:  node scripts/set-app-url.mjs https://your-domain.com");
  process.exit(1);
}
const isHttp = url.startsWith("http://");

function edit(rel, fn) {
  const p = path.join(root, rel);
  const before = existsSync(p) ? readFileSync(p, "utf8") : "";
  writeFileSync(p, fn(before));
  console.log("  ✓", rel);
}

console.log(`\nتنظیم آدرس اپ روی: ${url}\n`);

/* Windows / macOS / Linux (Electron) — default address for the "remote server" option (Ctrl + ,).
   The desktop app runs its own embedded server by default, so this is optional. */
edit("packaging/electron/config.json", () => JSON.stringify({ url }, null, 2) + "\n");

/* Windows (Tauri) */
edit("packaging/tauri/tauri.conf.json", (s) => {
  const j = JSON.parse(s);
  j.build.frontendDist = url;
  j.app.windows[0].url = url;
  return JSON.stringify(j, null, 2) + "\n";
});

console.log("\n✅ انجام شد.");
if (isHttp) console.log("⚠️  آدرس http فقط برای تست است؛ برای خروجی APK از PWABuilder و انتشار، به https نیاز داری.");
console.log("\nقدم بعدی:");
console.log("  ویندوز (exe):   build-exe-windows.bat   (سرور داخل خود EXE است؛ این آدرس فقط پیش‌فرض گزینه‌ی «اتصال به سرور» است)");
console.log("  اندروید (apk):  build-android-windows.bat   (اپ گوشی آفلاین است؛ اتصال به سرور از داخل تنظیمات اپ)");
console.log("  جزئیات بیشتر:   packaging/README.md\n");
