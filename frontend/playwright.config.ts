import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'npm --prefix ../backend run dev',
      url: 'http://localhost:4000/health',
      reuseExistingServer: true,
      timeout: 60_000,
      env: {
        NODE_ENV: 'development',
        PORT: '4000',
        DATABASE_DRIVER: 'file',
        DATA_DIR: './.e2e-data',
        LLM_PROVIDER: 'demo',
        CORS_ORIGIN: 'http://localhost:5173',
      },
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
