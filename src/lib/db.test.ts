import { describe, expect, it } from 'vitest'
import { DbError, describeDbError, resolveRefs } from './db'

/**
 * `$ref` is how a later statement points at a row an earlier one created —
 * it's what links a new fill-up to its timeline entry. It has to survive being
 * serialised to IndexedDB and replayed, so it's data rather than a closure.
 */
describe('resolveRefs', () => {
  it('substitutes a reference with the earlier result', () => {
    const results = [{ id: 'fuel-123' }]
    expect(resolveRefs({ $ref: [0, 'id'] }, results)).toBe('fuel-123')
  })

  it('resolves references nested in an object', () => {
    const results = [{ id: 'fuel-123' }]
    const payload = { source_id: { $ref: [0, 'id'] }, title: 'Fill-up' }
    expect(resolveRefs(payload, results)).toEqual({ source_id: 'fuel-123', title: 'Fill-up' })
  })

  it('resolves references inside arrays', () => {
    const results = [{ id: 'a' }, { id: 'b' }]
    expect(resolveRefs([{ $ref: [0, 'id'] }, { $ref: [1, 'id'] }], results)).toEqual(['a', 'b'])
  })

  it('resolves a reference to a field other than the id', () => {
    const results = [null, { total_cost: 70.86 }]
    expect(resolveRefs({ cost: { $ref: [1, 'total_cost'] } }, results)).toEqual({ cost: 70.86 })
  })

  it('yields null when the statement produced nothing to point at', () => {
    expect(resolveRefs({ $ref: [0, 'id'] }, [null])).toBeNull()
    expect(resolveRefs({ $ref: [3, 'id'] }, [])).toBeNull()
  })

  it('passes plain values straight through', () => {
    expect(resolveRefs('text', [])).toBe('text')
    expect(resolveRefs(42, [])).toBe(42)
    expect(resolveRefs(null, [])).toBeNull()
    expect(resolveRefs({ plain: true }, [])).toEqual({ plain: true })
  })

  it('does not mistake a malformed object for a reference', () => {
    expect(resolveRefs({ $ref: 'nope' }, [])).toEqual({ $ref: 'nope' })
  })
})

describe('describeDbError', () => {
  it('prefers the DbError message', () => {
    expect(describeDbError(new DbError('insert refused (42501)'), 'fallback')).toBe(
      'insert refused (42501)',
    )
  })

  it('uses a plain Error message', () => {
    expect(describeDbError(new Error('network down'), 'fallback')).toBe('network down')
  })

  it('appends the Postgres code and details', () => {
    const postgrest = { message: 'permission denied', code: '42501', details: 'row level security' }
    expect(describeDbError(postgrest, 'fallback')).toBe(
      'permission denied (42501) — row level security',
    )
  })

  it('falls back for anything unrecognisable', () => {
    expect(describeDbError(null, 'fallback')).toBe('fallback')
    expect(describeDbError(undefined, 'fallback')).toBe('fallback')
    expect(describeDbError({}, 'fallback')).toBe('fallback')
  })

  it('carries the Postgres code on the error, which decides retryability', () => {
    // A coded error was rejected on its merits, so the queue drops it instead of
    // retrying forever; a network failure has no code and stays queued.
    const coded = new DbError('rejected', { code: '42501' })
    expect(coded.code).toBe('42501')
    const uncoded = new DbError('failed to fetch')
    expect(uncoded.code).toBeUndefined()
  })
})
