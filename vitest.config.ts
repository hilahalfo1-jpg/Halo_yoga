import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      // The real `server-only` package throws outside React Server environments
      "server-only": path.resolve(__dirname, "src/test-stubs/server-only.ts"),
      "@": path.resolve(__dirname, "src"),
    },
  },
});
