import { defineConfig } from "vitest/config";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(__dirname, "../../.env") });

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 90_000,
    hookTimeout: 90_000,
  },
});
