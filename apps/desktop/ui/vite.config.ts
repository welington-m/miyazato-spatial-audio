import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    {
      name: "development-csp",
      transformIndexHtml(html) {
        // Vite React refresh injects an inline development bootstrap. Bundled production CSP stays strict.
        return command === "serve"
          ? html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, "")
          : html;
      },
    },
  ],
  base: "./",
  test: { environment: "jsdom", setupFiles: "./src/testSetup.ts" },
}));
