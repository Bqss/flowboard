import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Bun auto-loads `.env` for its own entrypoints (migrate.ts, server.ts), but
  // the Vite dev server runs under Node and does not. Without this, server-side
  // code that reads `process.env` (e.g. `config/env.ts`) falls back to defaults.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

  return {
    plugins: [tailwindcss(), sveltekit()],
    server: {
      port: Number(process.env.PORT) || 3000,
      fs: {
        // `app.css` sits at the `app/` root (nara-style layout), which is outside
        // SvelteKit's default allow list (app/pages, app/lib, src, ...). Allow it.
        allow: ['app']
      }
    }
  };
});
