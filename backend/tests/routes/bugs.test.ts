/**
 * Bugs route tests
 *
 * TDD intent: verify the full response shape returned by the API so that
 * frontend components can safely access nested relations (status, priority,
 * severity, source) without crashing on undefined.
 *
 * This test would have caught the original bug where DefectService.findByProject()
 * was missing `source: true` in its Prisma include, causing BugTable to crash
 * on `selectedBug.source.label`.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../src/app'

// Seeded test project and enum IDs (from prisma/seed.ts)
const TEST_PROJECT_ID = 'proj-webapp'
const SEED_STATUS_ID  = 'seed-bug_status-open'
const SEED_PRIORITY_ID = 'seed-bug_priority-high'
const SEED_SEVERITY_ID = 'seed-bug_severity-major'
const SEED_SOURCE_ID  = 'seed-bug_source-internal'
// These match the values seeded by prisma/seed.ts (independent of test setup.ts overrides)
const ADMIN_EMAIL    = 'admin@qauthority.com'
const ADMIN_PASSWORD = 'Changeme123!'

describe('Bugs routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>
  let authToken: string
  let createdBugId: string

  // ── Auth guard tests (no token) ────────────────────────────────────────────

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()

    // Authenticate once for all authenticated tests
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    })
    expect(loginRes.statusCode).toBe(200)
    authToken = loginRes.json<{ accessToken: string }>().accessToken
  })

  afterAll(async () => {
    // Clean up the bug created during tests
    if (createdBugId && authToken) {
      await app.inject({
        method: 'DELETE',
        url: `/api/v1/bugs/${createdBugId}`,
        headers: { authorization: `Bearer ${authToken}` },
      })
    }
    await app.close()
  })

  // ── Auth guards ────────────────────────────────────────────────────────────

  describe('GET /api/v1/projects/:projectId/bugs', () => {
    it('returns 401 without auth token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${TEST_PROJECT_ID}/bugs`,
      })
      expect(res.statusCode).toBe(401)
    })
  })

  describe('POST /api/v1/projects/:projectId/bugs', () => {
    it('returns 401 without auth token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${TEST_PROJECT_ID}/bugs`,
        payload: { title: 'Test bug', statusId: SEED_STATUS_ID, priorityId: SEED_PRIORITY_ID, severityId: SEED_SEVERITY_ID, sourceId: SEED_SOURCE_ID },
      })
      expect(res.statusCode).toBe(401)
    })

    it('returns 400 for missing required fields', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${TEST_PROJECT_ID}/bugs`,
        payload: { title: 'Missing fields' },
        headers: { authorization: `Bearer ${authToken}` },
      })
      expect(res.statusCode).toBe(400)
    })
  })

  // ── Response shape (the tests that would have caught the bug) ──────────────

  describe('POST + GET bug response shape', () => {
    it('creates a bug and returns it with all required relations', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/projects/${TEST_PROJECT_ID}/bugs`,
        payload: {
          title: 'Shape test bug',
          description: 'Verify all relations are present in response',
          statusId: SEED_STATUS_ID,
          priorityId: SEED_PRIORITY_ID,
          severityId: SEED_SEVERITY_ID,
          sourceId: SEED_SOURCE_ID,
        },
        headers: { authorization: `Bearer ${authToken}` },
      })

      expect(res.statusCode).toBe(201)
      const bug = res.json()
      createdBugId = bug.id

      // These assertions would have caught the missing source include
      expect(bug.status).toBeDefined()
      expect(bug.status.label).toBeTypeOf('string')
      expect(bug.priority).toBeDefined()
      expect(bug.priority.label).toBeTypeOf('string')
      expect(bug.severity).toBeDefined()
      expect(bug.severity.label).toBeTypeOf('string')
      expect(bug.source).toBeDefined()
      expect(bug.source.label).toBeTypeOf('string') // ← this would have failed before the fix
    })

    it('GET /projects/:id/bugs returns bugs with source relation populated', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${TEST_PROJECT_ID}/bugs`,
        headers: { authorization: `Bearer ${authToken}` },
      })

      expect(res.statusCode).toBe(200)
      const bugs = res.json<any[]>()
      expect(Array.isArray(bugs)).toBe(true)

      // Every bug in the list must have the relations the frontend depends on
      for (const bug of bugs) {
        expect(bug.status, `bug ${bug.id} missing status`).toBeDefined()
        expect(bug.status.label, `bug ${bug.id} missing status.label`).toBeTypeOf('string')
        expect(bug.priority, `bug ${bug.id} missing priority`).toBeDefined()
        expect(bug.priority.label, `bug ${bug.id} missing priority.label`).toBeTypeOf('string')
        expect(bug.severity, `bug ${bug.id} missing severity`).toBeDefined()
        expect(bug.severity.label, `bug ${bug.id} missing severity.label`).toBeTypeOf('string')
        expect(bug.source, `bug ${bug.id} missing source`).toBeDefined()
        expect(bug.source.label, `bug ${bug.id} missing source.label`).toBeTypeOf('string') // ← key assertion
      }
    })
  })

  // ── Stats endpoint ─────────────────────────────────────────────────────────

  describe('GET /api/v1/projects/:projectId/bugs/stats', () => {
    it('returns 401 without auth token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${TEST_PROJECT_ID}/bugs/stats`,
      })
      expect(res.statusCode).toBe(401)
    })

    it('returns stats shape with total and breakdown counts', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${TEST_PROJECT_ID}/bugs/stats`,
        headers: { authorization: `Bearer ${authToken}` },
      })

      expect(res.statusCode).toBe(200)
      const stats = res.json()
      expect(stats.total).toBeTypeOf('number')
      expect(stats.byStatus).toBeTypeOf('object')
      expect(stats.byPriority).toBeTypeOf('object')
      expect(stats.bySeverity).toBeTypeOf('object')
    })
  })
})
