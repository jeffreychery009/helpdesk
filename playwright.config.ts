import { defineConfig, devices } from "@playwright/test";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, ".env.test") });

const serverPort = 3001;
const clientPort = 5174;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: `http://localhost:${clientPort}`,
    trace: "on-first-retry",
  },
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: `PORT=${serverPort} bun run --filter server dev`,
      port: serverPort,
      reuseExistingServer: !process.env.CI,
      cwd: __dirname,
      env: {
        DATABASE_URL: process.env.DATABASE_URL!,
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL!,
        ADMIN_EMAIL: process.env.ADMIN_EMAIL!,
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD!,
        CLIENT_URL: process.env.CLIENT_URL!,
        PORT: String(serverPort),
      },
    },
    {
      command: `VITE_API_URL=http://localhost:${serverPort} bun run --filter client dev -- --port ${clientPort}`,
      port: clientPort,
      reuseExistingServer: !process.env.CI,
      cwd: __dirname,
      env: {
        VITE_API_URL: `http://localhost:${serverPort}`,
      },
    },
  ],
});
