import { supabase } from './supabaseClient'
import { DbError } from './db'
import { uid } from './format'

/**
 * Photos and documents used to be stored as base64 data URLs in Postgres rows,
 * which meant every fetch pulled the whole gallery over the wire as text. They
 * now live in the private `media` bucket and are served as short-lived signed
 * URLs.
 *
 * The convention the rest of the app relies on: the **database stores paths, the
 * app state holds display-ready URLs**. Resolution happens during a fetch (see
 * `resolveMedia`), so components just render strings.
 */

const BUCKET = 'media'

/** Seven days: long enough that an open tab doesn't lose its images. */
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7

/** Keeps a single phone photo from ballooning the bucket and the upload time. */
export const MAX_MEDIA_BYTES = 15 * 1024 * 1024

/**
 * A stored value is either an external URL (Unsplash placeholder, blob preview)
 * or a path inside the media bucket.
 */
export function isStoragePath(value?: string | null): value is string {
  return Boolean(value) && !/^(https?:|data:|blob:)/i.test(value as string)
}

export function isDataUrl(value?: string | null): boolean {
  return typeof value === 'string' && value.startsWith('data:')
}

function extensionFor(file: File): string {
  const fromName = file.name.includes('.') ? file.name.split('.').pop() : ''
  const clean = (fromName ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
  if (clean) return clean
  const fromType = file.type.split('/').pop() ?? ''
  return fromType.replace(/[^a-z0-9]/g, '') || 'bin'
}

/** Upload a picked file and return its storage path plus a signed preview URL. */
export async function uploadMedia(
  userId: string,
  file: File,
  prefix = 'media',
): Promise<{ path: string; url: string }> {
  if (file.size > MAX_MEDIA_BYTES) {
    throw new DbError(
      `File is larger than ${Math.round(MAX_MEDIA_BYTES / (1024 * 1024))} MB — try a smaller one`,
    )
  }

  const path = `${userId}/${prefix}-${uid('m')}.${extensionFor(file)}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  })
  if (error) throw new DbError(error.message)

  return { path, url: (await signedUrl(path)) ?? '' }
}

/** Upload the contents of a data URL — used by the one-off media backfill. */
export async function uploadDataUrl(
  userId: string,
  dataUrl: string,
  name = 'legacy',
): Promise<{ path: string; url: string }> {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  const file = new File([blob], name, { type: blob.type || 'application/octet-stream' })
  return uploadMedia(userId, file, 'legacy')
}

export async function signedUrl(
  path: string,
  expiresIn = SIGNED_URL_TTL_SECONDS,
): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn)
  if (error) return null
  return data?.signedUrl ?? null
}

/**
 * Sign many paths in one request. Signing a gallery one path at a time is an
 * N-request stall on every page load.
 */
export async function signedUrls(
  paths: string[],
  expiresIn = SIGNED_URL_TTL_SECONDS,
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))]
  const result = new Map<string, string>()
  if (unique.length === 0) return result

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(unique, expiresIn)
  if (error || !data) return result
  for (const item of data) {
    if (item.path && item.signedUrl) result.set(item.path, item.signedUrl)
  }
  return result
}

/** Resolve one stored value: external URLs pass through, paths get signed. */
export async function resolveMedia(value?: string | null): Promise<string | undefined> {
  if (!value) return undefined
  if (!isStoragePath(value)) return value
  return (await signedUrl(value)) ?? undefined
}

export async function deleteMedia(path?: string | null): Promise<void> {
  if (!isStoragePath(path)) return
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) {
    // Orphaned objects are a tidy-up problem, not something worth interrupting
    // the user over — the row delete is what they asked for.
    console.warn('Could not delete stored media', path, error.message)
  }
}
