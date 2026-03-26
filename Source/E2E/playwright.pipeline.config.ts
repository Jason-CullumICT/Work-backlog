import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/cycle-run-1774564580725-f34dc40c",
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: "http://localhost:5101",
    headless: true,
  },
});
