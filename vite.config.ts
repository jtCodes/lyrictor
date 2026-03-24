import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isElectronBuild = process.env.LYRICTOR_BUILD_TARGET === "electron";
  const outDir = isElectronBuild ? "build-desktop" : "build";

  return {
    base: isElectronBuild ? "./" : "/",
    plugins: [
      react({
        babel: {
          plugins: ["babel-plugin-react-compiler"],
        },
      }),
    ],
    define: {
      global: "globalThis",
      __LYRICTOR_DESKTOP_GOOGLE_CLIENT_SECRET__: JSON.stringify(
        isElectronBuild ? env.GOOGLE_DESKTOP_CLIENT_SECRET || "" : ""
      ),
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
    },
    build: {
      outDir,
      emptyOutDir: true,
    },
  };
});