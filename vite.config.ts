import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { getConfig } from "./parameters";

export default defineConfig(({ mode }) => {
  const config = getConfig(mode);

  const manifest = {
    manifest_version: 3,
    name: "Listing Tool",
    version: "0.1.0",
    description: "This extension helps you to list items on a web site.",
    icons: {
      "16": "icons/icon_16.png",
      "32": "icons/icon_32.png",
      "48": "icons/icon_48.png",
      "128": "icons/icon_128.png",
    },
    action: {
      default_popup: "popup.html",
    },
    permissions: ["storage"],
    content_scripts: [
      {
        matches: ["https://jp.mercari.com/*"],
        run_at: "document_idle",
        js: ["src/content-scripts/scriptMerc.ts"],
      },
      {
        matches: ["https://www.ebay.com/lstng*"],
        run_at: "document_idle",
        js: ["src/content-scripts/scriptEbay.ts"],
      },
      {
        matches: [config.siteUrl + "/*"],
        run_at: "document_idle",
        js: ["src/content-scripts/scriptSystem.ts"],
      },
    ],
  };

  return {
    plugins: [react(), crx({ manifest })],
    esbuild: {
      drop: mode === "production" ? ["console", "debugger"] : [],
    },
    define: {
      __API_URL__: JSON.stringify(config.apiUrl),
      __USER_POOL_CLIENT_ID__: JSON.stringify(config.userPoolClientID),
    },
  };
});
