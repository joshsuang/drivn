import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

/**
 * Kept separate from vite.config.ts on purpose.
 *
 * Vite resolves `vite.config.js` before `vite.config.ts`, and `tsc -b` emits that
 * .js from the .ts — so a `test` block added there would live in a build artifact.
 * A dedicated config also keeps the PWA plugin, which has no business running in
 * unit tests, out of the way.
 *
 * Everything under test is pure logic, so the node environment is enough.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // src/lib/supabaseClient.ts calls createClient at module load, so importing
    // anything that reaches it (db.ts, for one) needs a syntactically valid
    // project. Nothing here makes a network call.
    env: {
      VITE_SUPABASE_URL: 'https://test-project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
})
