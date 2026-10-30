import type { NextConfig } from "next";

/* Two build targets:
 *   default           → server build (`.next/standalone`) used by Docker, `npm start` and the Windows EXE
 *   PLANNER_TARGET=mobile → static export (`out/`) for the Android/iOS shell. There is no server:
 *                       the app talks to an in-browser PostgreSQL (PGlite) stored in IndexedDB.
 *                       Route handlers (`route.ts`) are excluded via `pageExtensions`. */
const mobile = process.env.PLANNER_TARGET === "mobile";

const nextConfig: NextConfig = {
  // PGlite ships WASM + data files that must be loaded from node_modules at runtime, not bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  env: { NEXT_PUBLIC_PLANNER_TARGET: mobile ? "mobile" : "server" },
  ...(mobile
    ? {
        output: "export",
        distDir: ".next-mobile",
        pageExtensions: ["tsx"],
        images: { unoptimized: true },
        // PGlite is loaded at runtime from /pglite/ (unbundled); keep the bundler away from it.
        turbopack: { resolveAlias: { "@electric-sql/pglite": "./src/local/pglite-stub.ts" } },
      }
    : {
        output: "standalone",
      }),
};

export default nextConfig;
