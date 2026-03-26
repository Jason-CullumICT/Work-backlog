// Verifies: FR-WF-006, FR-WF-009, FR-WF-010 — E2E test configuration with webServer startup
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
  webServer: [
    {
      command: 'npx ts-node src/app.ts',
      cwd: '../Backend',
      port: 3001,
      reuseExistingServer: true,
      timeout: 15000,
    },
    {
      command: 'npm run dev',
      cwd: '../Frontend',
      port: 5173,
      reuseExistingServer: true,
      timeout: 15000,
    },
  ],
});
