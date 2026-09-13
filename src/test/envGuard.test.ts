import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * The guard runs as its own process (it gates `npm run build`), so these tests
 * exercise it the way the build does: spawn it against a throwaway env dir.
 *
 * Every case builds its own directory rather than reading the repo's `.env`,
 * which doesn't exist on CI — a test that passed locally and failed in CI, or
 * vice versa, would be worse than no test.
 */
const script = fileURLToPath(new URL('../../scripts/check-env.mjs', import.meta.url))

/**
 * `loadEnv` merges matching `process.env` entries on top of the files, and
 * vitest.config.ts supplies `VITE_*` so that importing the Supabase client under
 * test doesn't throw. A spawned guard would inherit those and every "missing"
 * case would silently pass, so children get a scrubbed environment.
 */
function cleanEnv(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  // Scrub the inherited environment first, then apply extras — the other order
  // would delete the variables a caller deliberately supplied.
  const inherited = { ...process.env }
  for (const key of Object.keys(inherited)) {
    if (key.startsWith('VITE_')) delete inherited[key]
  }
  return { ...inherited, ...extra }
}

function runGuard(args: string[]): { code: number; output: string } {
  try {
    const stdout = execFileSync(process.execPath, [script, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: cleanEnv(),
    })
    return { code: 0, output: stdout }
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string }
    return {
      code: failure.status ?? -1,
      output: `${failure.stdout ?? ''}${failure.stderr ?? ''}`,
    }
  }
}

function envDir(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'drivn-env-'))
  for (const [name, contents] of Object.entries(files)) {
    writeFileSync(join(dir, name), contents)
  }
  return dir
}

const PRODUCTION_ENV = [
  'VITE_SUPABASE_URL=https://example.supabase.co',
  'VITE_SUPABASE_ANON_KEY=anon',
].join('\n')

describe('build env guard', () => {
  it('fails a production build that has no config, naming both variables', () => {
    const { code, output } = runGuard(['--dir', envDir({}), '--mode', 'production'])

    expect(code).toBe(1)
    expect(output).toContain('VITE_SUPABASE_URL')
    expect(output).toContain('VITE_SUPABASE_ANON_KEY')
  })

  it('passes when the config is present', () => {
    const dir = envDir({ '.env.production': PRODUCTION_ENV })
    const { code, output } = runGuard(['--dir', dir, '--mode', 'production'])

    expect(code).toBe(0)
    expect(output).toContain('Supabase env present')
  })

  it('is satisfied by the mode-independent .env, which is how local dev is set up', () => {
    const dir = envDir({ '.env': PRODUCTION_ENV })
    expect(runGuard(['--dir', dir, '--mode', 'production']).code).toBe(0)
    expect(runGuard(['--dir', dir, '--mode', 'development']).code).toBe(0)
  })

  it('still fails a production build fed only development values', () => {
    // Precisely the failure mode this guard exists for: values that work in
    // `npm run dev` but never reach a production build.
    const dir = envDir({ '.env.development': PRODUCTION_ENV })
    const { code, output } = runGuard(['--dir', dir, '--mode', 'production'])

    expect(code).toBe(1)
    expect(output).toContain('VITE_SUPABASE_URL')
  })

  it('treats an empty value as missing rather than present', () => {
    const dir = envDir({ '.env.production': 'VITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY=' })
    expect(runGuard(['--dir', dir, '--mode', 'production']).code).toBe(1)
  })

  it('accepts variables exported into the environment, which is how hosts inject them', () => {
    // The host's "environment variables" setting arrives as process.env, not as
    // an .env file, so the guard has to see those too.
    const result = execFileSync(process.execPath, [script, '--dir', envDir({})], {
      encoding: 'utf8',
      env: cleanEnv({
        VITE_SUPABASE_URL: 'https://exported.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'exported-anon',
      }),
    })

    expect(result).toContain('Supabase env present')
  })

  it('can be bypassed deliberately', () => {
    const result = execFileSync(process.execPath, [script, '--dir', envDir({})], {
      encoding: 'utf8',
      env: cleanEnv({ SKIP_ENV_CHECK: '1' }),
    })

    expect(result).toContain('skipped')
  })
})