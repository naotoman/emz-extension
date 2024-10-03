import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import manifest from "./manifest.json";

export default defineConfig(({ mode }) => {
  return {
    plugins: [react(), crx({ manifest })],
    esbuild: {
      drop: mode === "production" ? ["console", "debugger"] : [],
    },
  };
});
