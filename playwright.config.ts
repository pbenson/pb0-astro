import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:4322',
    headless: true,
  },
  // No webServer block: `astro preview` always daemonises, so Playwright's
  // foreground process exits immediately and the run aborts. The test:e2e
  // script builds and starts the preview daemon on 4322 instead. It serves
  // dist/ from disk, so each build is picked up without a restart.
  //
  // Port 4322, not 4321: 4321 is the dev server, and testing against that
  // means testing HMR and lazily discovered dependencies — the source of
  // "504 Outdated Optimize Dep" failures mid-run.
});
