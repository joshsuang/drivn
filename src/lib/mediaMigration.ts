import { runStatements, type Statement } from './db'
import { uploadDataUrl } from './media'
import { fetchLegacyImages, fetchLegacyMedia } from './supabaseData'

/**
 * One-off backfill for accounts created before media moved to storage.
 *
 * Runs in the browser rather than from a script so it never needs a
 * service-role key: the user's own session can read their rows and write their
 * own objects. Idempotent — rows that have nothing left to migrate are skipped.
 */

export interface MigrationProgress {
  done: number
  total: number
  label: string
}

export interface MigrationResult {
  migrated: number
  failed: number
}

export async function migrateMedia(
  userId: string,
  onProgress?: (progress: MigrationProgress) => void,
): Promise<MigrationResult> {
  const [photos, documents, images] = await Promise.all([
    fetchLegacyMedia(userId, 'photos'),
    fetchLegacyMedia(userId, 'documents'),
    fetchLegacyImages(userId),
  ])

  const total = photos.length + documents.length + images.length
  let migrated = 0
  let failed = 0
  let done = 0

  const report = (label: string) => onProgress?.({ done, total, label })

  report('Starting…')

  for (const photo of photos) {
    try {
      const { path } = await uploadDataUrl(userId, photo.dataUrl, `${photo.id}.jpg`)
      await runStatements([
        {
          table: 'photos',
          op: 'update',
          // Clear both legacy columns; `url` was set to the data URL on upload.
          patch: { storage_path: path, url: null, file_data: null },
          match: { id: photo.id },
        },
      ])
      migrated += 1
    } catch {
      failed += 1
    }
    done += 1
    report('Photos')
  }

  for (const document of documents) {
    try {
      const { path } = await uploadDataUrl(userId, document.dataUrl, `${document.id}.pdf`)
      await runStatements([
        {
          table: 'documents',
          op: 'update',
          patch: { storage_path: path, file_data: null },
          match: { id: document.id },
        },
      ])
      migrated += 1
    } catch {
      failed += 1
    }
    done += 1
    report('Documents')
  }

  for (const image of images) {
    try {
      const { path } = await uploadDataUrl(userId, image.dataUrl, `${image.kind}.jpg`)
      const statement: Statement =
        image.kind === 'vehicle'
          ? { table: 'vehicle', op: 'update', patch: { image_url: path }, match: { id: image.id! } }
          : { table: 'app_settings', op: 'update', patch: { avatar_url: path }, match: { user_id: userId } }
      await runStatements([statement])
      migrated += 1
    } catch {
      failed += 1
    }
    done += 1
    report(image.kind === 'vehicle' ? 'Vehicle photo' : 'Profile photo')
  }

  report('Done')
  return { migrated, failed }
}
