import adapter from 'svelte-adapter-bun';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),

    // The frontend lives under `app/` (nara-style layout), not the default
    // `src/`. Point SvelteKit at the moved files. `app/pages` holds the routes.
    files: {
      routes: 'app/pages',
      lib: 'app/lib',
      assets: 'static',
      appTemplate: 'app/app.html',
      hooks: { server: 'app/hooks.server.ts' }
    },

    // Aliases for the Elysia backend layers. Mirrored in tsconfig.json `paths`
    // so both Vite/SSR and the Bun runtime (server.ts, scripts) resolve them.
    alias: {
      '@': 'app',
      '@core': 'app/core',
      '@config': 'app/config',
      '@db': 'app/db',
      '@handlers': 'app/handlers',
      '@middlewares': 'app/middlewares',
      '@services': 'app/services',
      '@validators': 'app/validators',
      '@types': 'app/types',
      '@routes': 'routes'
    }
  }
};

export default config;
