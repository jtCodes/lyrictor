import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => {
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