// @ts-check
const { defineConfig, devices } = require("@playwright/test");

const PYTHON = process.env.PYTHON || "python";
const API_URL = "http://localhost:5555";
const CLIENT_URL = "http://localhost:4000";

module.exports = defineConfig({
  testDir: "./tests",
  // Both servers share one SQLite DB; keep runs predictable.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: CLIENT_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Starts Flask (migrated + seeded) and the React dev server, or reuses
  // ones you already have running locally.
  webServer: [
    {
      command: `${PYTHON} -m flask db upgrade && ${PYTHON} seed.py && ${PYTHON} app.py`,
      cwd: "../server",
      url: `${API_URL}/articles`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: "npm start --prefix ../client",
      url: CLIENT_URL,
      // DANGEROUSLY_DISABLE_HOST_CHECK works around a CRA 5 "allowedHosts[0]"
      // crash on machines without a LAN address (containers, CI).
      env: { BROWSER: "none", DANGEROUSLY_DISABLE_HOST_CHECK: "true" },
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
