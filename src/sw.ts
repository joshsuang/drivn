/**
 * Drivn service worker.
 *
 * Hand-written rather than generated so the storage-media cache can key on the
 * object path instead of the full URL. Signed URLs carry a token that rotates on
 * every fetch, so a naive cache would miss every single time and grow without
 * bound — the gallery would never actually be available offline.
 *
 * Built by vite-plugin-pwa in `injectManifest` mode, which replaces
 * `self.__WB_MANIFEST` with the list of hashed build assets.
 */

interface PrecacheEntry {
  url: string
  revision: string | null
}

type FetchEventLike = {
  request: Request
  respondWith: (response: Response | Promise<Response>) => void
}

type ExtendableEventLike = {
  waitUntil: (promise: Promise<unknown>) => void
}

declare global {
  interface Window {
    // Injected by vite-plugin-pwa at build time. Referenced as the literal
    // `self.__WB_MANIFEST` below, because that exact text is how the plugin
    // locates its injection point.
    __WB_MANIFEST: PrecacheEntry[]
  }
}

interface WorkerScope {
  location: Location
  addEventListener(type: 'install' | 'activate', listener: (event: ExtendableEventLike) => void): void
  addEventListener(type: 'fetch', listener: (event: FetchEventLike) => void): void
  skipWaiting: () => Promise<void>
  clients: { claim: () => Promise<void> }
}

// The DOM lib describes `self` as a Window; inside a worker it isn't one.
const sw = self as unknown as WorkerScope

const PRECACHE = 'drivn-precache-v1'
const MEDIA_CACHE = 'drivn-media-v1'
const FONT_CACHE = 'drivn-fonts-v1'
const MEDIA_ENTRY_LIMIT = 300

const precacheUrls = (self.__WB_MANIFEST ?? []).map((entry) =>
  typeof entry === 'string' ? entry : entry.url,
)
const PRECACHE_PATHS = new Set(precacheUrls)

sw.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE)
      await Promise.all(
        precacheUrls.map(async (url) => {
          try {
            // cache: 'reload' bypasses the HTTP cache so a new deploy is real.
            await cache.add(new Request(url, { cache: 'reload' }))
          } catch {
            // One missing asset shouldn't fail the whole install.
          }
        }),
      )
      await sw.skipWaiting()
    })(),
  )
})

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys.filter((key) => key.startsWith('drivn-') && key !== PRECACHE && key !== MEDIA_CACHE && key !== FONT_CACHE)
          .map((key) => caches.delete(key)),
      )
      await sw.clients.claim()
    })(),
  )
})

/** Strip the query so rotating signed-URL tokens share one cache entry. */
function mediaCacheKey(request: Request): string {
  const url = new URL(request.url)
  url.search = ''
  return url.toString()
}

async function trimCache(name: string, maxEntries: number) {
  const cache = await caches.open(name)
  const keys = await cache.keys()
  if (keys.length <= maxEntries) return
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)))
}

async function cacheFirst(request: Request, cacheName: string, key?: string): Promise<Response> {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(key ?? request)
  if (cached) return cached

  const response = await fetch(request)
  // Opaque responses can't be inspected but are still worth storing (fonts).
  if (response && (response.ok || response.type === 'opaque')) {
    await cache.put(key ?? request, response.clone())
  }
  return response
}

sw.addEventListener('fetch', (event) => {
  const { request, respondWith } = event
  if (request.method !== 'GET') return

  let url: URL
  try {
    url = new URL(request.url)
  } catch {
    return
  }

  const isSupabase = /(^|\.)supabase\.co$/i.test(url.hostname)

  // Car data and auth must never come from cache — a stale car is worse than a
  // slow one, and offline writes are already queued and replayed by the app.
  if (isSupabase && /\/(rest|auth)\//i.test(url.pathname)) return

  if (isSupabase && url.pathname.includes('/storage/v1/object/')) {
    respondWith(
      cacheFirst(request, MEDIA_CACHE, mediaCacheKey(request))
        .then(async (response) => {
          await trimCache(MEDIA_CACHE, MEDIA_ENTRY_LIMIT)
          return response
        })
        .catch(() => Response.error()),
    )
    return
  }

  if (/(^|\.)(fonts\.googleapis\.com|fonts\.gstatic\.com)$/i.test(url.hostname)) {
    respondWith(cacheFirst(request, FONT_CACHE).catch(() => Response.error()))
    return
  }

  if (url.origin !== sw.location.origin) return

  // Navigations: live page when online, precached shell when not.
  if (request.mode === 'navigate') {
    respondWith(
      (async () => {
        try {
          return await fetch(request)
        } catch {
          const cache = await caches.open(PRECACHE)
          return (
            (await cache.match('/index.html')) ??
            (await cache.match('/')) ??
            Response.error()
          )
        }
      })(),
    )
    return
  }

  // Content-hashed same-origin assets are already precached.
  if (!PRECACHE_PATHS.has(url.pathname)) return
  respondWith(cacheFirst(request, PRECACHE).catch(() => Response.error()))
})

export {}
