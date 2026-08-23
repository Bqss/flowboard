import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import type { Plugin, ViteDevServer } from 'vite';
import { defineConfig, loadEnv } from 'vite';

const backendRe =
  /(?:^|\/)(?:app\/(?:handlers|middlewares|services|db|core)|routes)\/|hooks\.server\.ts$/;

/** Rebuild the Elysia graph when backend files change so SSR fetches never hit a stale app. */
const backendHmr = (): Plugin => ({
  name: 'flowboard-backend-hmr',
  configureServer(server: ViteDevServer) {
    server.watcher.on('change', (file) => {
      if (!backendRe.test(file)) return;

      server.ws.send({ type: 'custom', event: 'flowboard:api-reload' });

      for (const mod of server.moduleGraph.idToModuleMap.values()) {
        if (mod.id && backendRe.test(mod.id)) {
          server.moduleGraph.invalidateModule(mod);
        }
      }
    });
  }
});

export default defineConfig(({ mode }) => {
  // Bun auto-loads `.env` for its own entrypoints (migrate.ts, server.ts), but
  // the Vite dev server runs under Node and does not. Without this, server-side
  // code that reads `process.env` (e.g. `config/env.ts`) falls back to defaults.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

  return {
    plugins: [backendHmr(), tailwindcss(), sveltekit()],
    server: {
      port: Number(process.env.PORT) || 3000,
      fs: {
        // `app.css` sits at the `app/` root (nara-style layout), which is outside
        // SvelteKit's default allow list (app/pages, app/lib, src, ...). Allow it.
        allow: ['app']
      }
    },
    ssr: {
      // Keep the postgres driver out of the SSR bundle so Vite HMR does not
      // re-instantiate connection pools on every backend file save.
      external: ['postgres']
    }
  };
});
