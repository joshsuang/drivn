#!/usr/bin/env node
/**
 * Fails a production build when the Supabase config is missing.
 *
 * Vite inlines `VITE_*` variables at build time. A host that builds without
 * them ships a bundle where `createClient()` throws during the first module
 * evaluation — a blank page in production, and nothing in the build log to
 * explain it. Checking here turns that silent runtime failure into a build
 * failure, which the host prints in its own deploy log next to the fix.
 *
 *   node scripts/check-env.mjs [--dir <path>] [--mode <mode>]
 *
 * Exit code 0 when every required variable is present, 1 otherwise.
 * Set SKIP_ENV_CHECK=1 to bypass deliberately.
 */
import { loadEnv } from 'vite'

const REQUIRED = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']

function parseArgs(argv) {
  const args = { dir: process.cwd(), mode: 'production', help: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--dir') args.dir = argv[i + 1]
    else if (arg === '--mode') args.mode = argv[i + 1]
    else if (arg === '--help' || arg === '-h') args.help = true
  }
  return args
}

const args = parseArgs(process.argv.slice(2))

if (args.help) {
  console.log('Usage: node scripts/check-env.mjs [--dir <path>] [--mode <mode>]')
  process.exit(0)
}

if (process.env.SKIP_ENV_CHECK === '1') {
  console.log('• env check skipped (SKIP_ENV_CHECK=1)')
  process.exit(0)
}

// Same resolution Vite itself uses: .env, then .env.<mode>, mode-specific last.
const env = loadEnv(args.mode, args.dir, 'VITE_')
const missing = REQUIRED.filter((name) => !env[name])

if (missing.length === 0) {
  console.log(`✓ Supabase env present (mode: ${args.mode})`)
  process.exit(0)
}

console.error(`✗ Missing ${missing.join(', ')} for a "${args.mode}" build.`)
console.error(`
  Vite inlines these at build time, so a build without them produces an app
  that throws on load and shows "Drivn couldn't start" instead of the app.

  Set them wherever this build runs:
    hosting provider  → project settings → environment variables, then redeploy
    locally           → .env in the project root (see .env.example)
    GitHub Actions    → repository secrets, passed as env: on the build step

  This is rejected on purpose; set SKIP_ENV_CHECK=1 to override.
`)
process.exit(1)
