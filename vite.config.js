import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// One id per build. The running app compares this against the deployed
// version.json to detect when a newer build is live (see src/lib/updater.js).
const BUILD_ID = String(Date.now());

// Emit an unhashed version.json at the site root so the client can poll it
// with cache-busting and know when to reload — no service worker needed.
function emitVersionJson() {
  return {
    name: 'emit-version-json',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ buildId: BUILD_ID }),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), emitVersionJson()],
  base: '/TimeManagmentApp/',
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
});
