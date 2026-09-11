import { supabase } from './supabaseClient'

/**
 * The single place writes happen.
 *
 * Every action is expressed as a batch of statements rather than a hand-written
 * chain of Supabase calls, which buys three things:
 *   1. errors can't be ignored — every statement is checked and throws;
 *   2. a multi-step write (add fill-up + timeline event + bump odometer) is one
 *      unit with a readable label for the UI;
 *   3. the batch is plain JSON, so it can be queued in IndexedDB and replayed
 *      when the connection returns.
 */

export type Table =
  | 'vehicle'
  | 'app_settings'
  | 'timeline_events'
  | 'fuel_entries'
  | 'maintenance_entries'
  | 'modifications'
  | 'trips'
  | 'documents'
  | 'photos'
  | 'expenses'

export type Row = Record<string, unknown>

/**
 * Points at a field on an earlier statement's returned row, e.g.
 * `{ $ref: [0, 'id'] }` is the id of whatever statement 0 inserted. Kept as
 * data (not a closure) so a queued batch survives JSON round-tripping.
 */
export interface Ref {
  $ref: [number, string]
}

export type Statement =
  | { table: Table; op: 'insert'; payload: Row | Row[]; returning?: boolean }
  | { table: Table; op: 'upsert'; payload: Row | Row[]; returning?: boolean }
  | { table: Table; op: 'update'; patch: Row; match: Row; returning?: boolean }
  | { table: Table; op: 'delete'; match: Row }

/** The slices of app state that can be refreshed independently. */
export type Collection =
  | 'vehicle'
  | 'settings'
  | 'timeline'
  | 'fuelEntries'
  | 'maintenance'
  | 'modifications'
  | 'trips'
  | 'documents'
  | 'photos'
  | 'expenses'

/** Realtime payloads name a table; state is organised by collection. */
export const COLLECTION_BY_TABLE: Record<Table, Collection> = {
  vehicle: 'vehicle',
  app_settings: 'settings',
  timeline_events: 'timeline',
  fuel_entries: 'fuelEntries',
  maintenance_entries: 'maintenance',
  modifications: 'modifications',
  trips: 'trips',
  documents: 'documents',
  photos: 'photos',
  expenses: 'expenses',
}

/**
 * A serializable description of how a queued write should appear in local state
 * while it waits. Persisted with the batch so an offline edit survives a reload
 * and is still visible before it ever reaches the server.
 */
export interface OptimisticOp {
  collection: Collection
  kind: 'insert' | 'update' | 'delete'
  id: string
  /** Full item for an insert; the changed fields for an update. */
  item?: Row
  patch?: Row
  /**
   * Match a generated timeline event by the row it came from rather than by its
   * own id, which the client doesn't know yet.
   */
  sourceId?: string
}

export interface MutationBatch {
  id: string
  createdAt: number
  /** Human-readable, shown in the offline banner and in error toasts. */
  label: string
  statements: Statement[]
  /** Replayed onto fetched state so queued work stays visible after a reload. */
  optimistic?: OptimisticOp[]
}

export class DbError extends Error {
  readonly code?: string
  readonly detail?: string

  constructor(message: string, opts: { code?: string; detail?: string } = {}) {
    super(message)
    this.name = 'DbError'
    this.code = opts.code
    this.detail = opts.detail
  }
}

function isRef(value: unknown): value is Ref {
  return (
    typeof value === 'object' &&
    value !== null &&
    '$ref' in value &&
    Array.isArray((value as Ref).$ref)
  )
}

/** Replace `$ref` placeholders with values from earlier statements' results. */
export function resolveRefs(value: unknown, results: (Row | null)[]): unknown {
  if (isRef(value)) {
    const [index, field] = value.$ref
    return results[index]?.[field] ?? null
  }
  if (Array.isArray(value)) return value.map((v) => resolveRefs(v, results))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Row).map(([k, v]) => [k, resolveRefs(v, results)]),
    )
  }
  return value
}

/** Turn a PostgrestError (or anything else) into something worth showing a user. */
export function describeDbError(error: unknown, fallback: string): string {
  if (error instanceof DbError) return error.message
  if (error instanceof Error) return error.message || fallback
  if (error && typeof error === 'object' && 'message' in error) {
    const e = error as { message?: string; code?: string; details?: string }
    const parts = [e.message, e.code && `(${e.code})`].filter(Boolean)
    if (parts.length) return `${parts.join(' ')}${e.details ? ` — ${e.details}` : ''}`
  }
  return fallback
}

/**
 * Run a batch in order, stopping at the first failure. Statements run
 * sequentially rather than in parallel because later ones routinely depend on
 * earlier ids.
 */
export async function runStatements(statements: Statement[]): Promise<(Row | null)[]> {
  const results: (Row | null)[] = []

  for (const [index, statement] of statements.entries()) {
    const at = `statement ${index} (${statement.op} ${statement.table})`
    try {
      if (statement.op === 'insert') {
        const payload = resolveRefs(statement.payload, results) as Row | Row[]
        const query = supabase.from(statement.table).insert(payload)
        if (!statement.returning) {
          const { error } = await query
          if (error) throw error
          results.push(null)
        } else {
          const { data, error } = await query.select()
          if (error) throw error
          const rows = (data ?? []) as Row[]
          results.push(rows[0] ?? null)
        }
      } else if (statement.op === 'upsert') {
        const payload = resolveRefs(statement.payload, results) as Row | Row[]
        const query = supabase.from(statement.table).upsert(payload)
        if (!statement.returning) {
          const { error } = await query
          if (error) throw error
          results.push(null)
        } else {
          const { data, error } = await query.select()
          if (error) throw error
          const rows = (data ?? []) as Row[]
          results.push(rows[0] ?? null)
        }
      } else if (statement.op === 'update') {
        const patch = resolveRefs(statement.patch, results) as Row
        const match = resolveRefs(statement.match, results) as Row
        let query = supabase.from(statement.table).update(patch)
        for (const [column, value] of Object.entries(match)) {
          query = value === null ? query.is(column, null) : query.eq(column, value)
        }
        if (!statement.returning) {
          const { error } = await query
          if (error) throw error
          results.push(null)
        } else {
          const { data, error } = await query.select()
          if (error) throw error
          const rows = (data ?? []) as Row[]
          results.push(rows[0] ?? null)
        }
      } else {
        const match = resolveRefs(statement.match, results) as Row
        let query = supabase.from(statement.table).delete()
        for (const [column, value] of Object.entries(match)) {
          query = value === null ? query.is(column, null) : query.eq(column, value)
        }
        const { error } = await query
        if (error) throw error
        results.push(null)
      }
    } catch (error) {
      const e = error as { message?: string; code?: string; details?: string }
      throw new DbError(
        `${e?.message ?? 'Write failed'}${e?.code ? ` (${e.code})` : ''} — ${at}`,
        { code: e?.code, detail: e?.details },
      )
    }
  }

  return results
}

/** True unless the browser is confidently offline. */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}
