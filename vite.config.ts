import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import checker from "vite-plugin-checker";

export default defineConfig(({ command }) => {
  const isElectronBuild = process.env.LYRICTOR_BUILD_TARGET === "electron";
  const outDir = isElectronBuild ? "build-desktop" : "build";
  const shouldRunChecker = command === "serve";

  return {
    base: isElectronBuild ? "./" : "/",
    plugins: [
      react({
        babel: {
          plugins: ["babel-plugin-react-compiler"],
        },
      }),
      ...(shouldRunChecker
        ? [
            checker({
              typescript: true,
            }),
          ]
        : []),
    ],
    define: {
      global: "globalThis",
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: "globalThis",
        },
      },
    },
    server: {
      host: "127.0.0.1",
      port: 3000,
      strictPort: true,
      proxy: {
        "/api/apple-top-songs": {
          target: "https://rss.marketingtools.apple.com",
          changeOrigin: true,
          rewrite: (path) => {
            const url = new URL(`http://localhost${path}`);
            const rawCountry = url.searchParams.get("country") ?? "us";
            const rawLimit = Number.parseInt(url.searchParams.get("limit") ?? "5", 10);
            const country = /^[a-z]{2}$/i.test(rawCountry) ? rawCountry.toLowerCase() : "us";
            const limit = Number.isFinite(rawLimit)
              ? Math.min(100, Math.max(1, rawLimit))
              : 5;

            return `/api/v2/${country}/music/most-played/${limit}/songs.json`;
          },
        },
      },
    },
    build: {
      outDir,
      emptyOutDir: true,
    },
  };
});