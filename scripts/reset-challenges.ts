// Wipes all challenge data and re-syncs from scratch so IDs are assigned
// in the correct order (tutorial-* first, then alphabetical).
//
// What is preserved: challenge_contributors, challenge_submissions (saved by slug, re-linked after re-sync)
//
// Usage:
//   npx tsx scripts/reset-challenges.ts

import { execSync } from 'node:child_process'

import { config } from 'dotenv'
import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { challengeContributors, challengeSubmissions, challenges } from '../db/schema'

config({ path: '.env.local' })

const connectionString = process.env.POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL
if (!connectionString) {
  console.error('POSTGRES_URL_NON_POOLING (or DATABASE_URL) is not set.')
  process.exit(1)
}

const client = postgres(connectionString)
const db = drizzle(client)

async function main() {
  // 1. Save contributors and submissions keyed by slug
  const savedContributors = await db
    .select({
      slug: challenges.slug,
      githubLogin: challengeContributors.githubLogin,
      contributedAt: challengeContributors.contributedAt,
    })
    .from(challengeContributors)
    .innerJoin(challenges, eq(challengeContributors.challengeId, challenges.id))

  const savedSubmissions = await db
    .select({
      slug: challenges.slug,
      userId: challengeSubmissions.userId,
      language: challengeSubmissions.language,
      verdict: challengeSubmissions.verdict,
      submittedAt: challengeSubmissions.submittedAt,
    })
    .from(challengeSubmissions)
    .innerJoin(challenges, eq(challengeSubmissions.challengeId, challenges.id))

  console.log(`Saved ${savedContributors.length} contributor row(s)`)
  console.log(`Saved ${savedSubmissions.length} submission row(s)`)

  // 2. Delete submissions and contributors first (no cascade anymore), then challenges
  await db.delete(challengeSubmissions)
  await db.delete(challengeContributors)
  await db.delete(challenges)
  console.log('Deleted all challenges')

  // 3. Reset serial sequence to 1
  await db.execute(sql`ALTER SEQUENCE challenges_id_seq RESTART WITH 1`)
  console.log('Reset challenges_id_seq to 1')

  await client.end()

  // 4. Re-sync from files (tutorial-* inserted first)
  console.log('\nRunning sync...')
  execSync('npx tsx scripts/sync-challenges.ts', { stdio: 'inherit' })

  // 5. Re-link contributors and submissions using new IDs
  const client2 = postgres(connectionString!)
  const db2 = drizzle(client2)

  const challengeRows = await db2
    .select({ id: challenges.id, slug: challenges.slug })
    .from(challenges)

  const slugToId = Object.fromEntries(challengeRows.map((r) => [r.slug, r.id]))

  for (const row of savedContributors) {
    const newId = slugToId[row.slug]
    if (!newId) { console.warn(`  Contributor: slug not found: ${row.slug}`); continue }
    await db2
      .insert(challengeContributors)
      .values({ challengeId: newId, githubLogin: row.githubLogin, contributedAt: row.contributedAt })
      .onConflictDoNothing()
  }
  console.log(`Re-linked ${savedContributors.length} contributor row(s)`)

  for (const row of savedSubmissions) {
    const newId = slugToId[row.slug]
    if (!newId) { console.warn(`  Submission: slug not found: ${row.slug}`); continue }
    await db2
      .insert(challengeSubmissions)
      .values({ challengeId: newId, userId: row.userId, language: row.language, verdict: row.verdict, submittedAt: row.submittedAt })
  }
  console.log(`Re-linked ${savedSubmissions.length} submission row(s)`)

  await client2.end()
  console.log('\nDone.')
}

main().catch((e) => { console.error(e); process.exit(1) })
