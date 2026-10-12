import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["cjs"],
  clean: true,
  // @barbershop/db points at TypeScript source, so it must be bundled.
  noExternal: ["@barbershop/db"],
});
