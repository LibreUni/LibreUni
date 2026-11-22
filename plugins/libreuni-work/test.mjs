// Self-check for the pure parts of the LibreUni work plugin.
// Run: node plugins/libreuni-work/test.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  packTopic,
  parseFrontmatter,
  parseManifest,
  repositoryPath,
  route,
  sanitizeArgs,
  selfCheck,
  validationTier,
} from './index.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '../..')

const failures = selfCheck()
assert.deepEqual(failures, [], `selfCheck failures:\n${failures.join('\n')}`)

// Parses every real manifest the same way the toy fixture is parsed.
import { readdirSync } from 'node:fs'
const manifestDir = join(root, 'src/data/course-manifests')
for (const file of readdirSync(manifestDir).filter((entry) => entry.endsWith('.yml'))) {
  const parsed = parseManifest(readFileSync(join(manifestDir, file), 'utf8'))
  assert.ok(parsed.lessons.length > 0, `${file}: no lessons parsed`)
  assert.equal(new Set(parsed.lessons).size, parsed.lessons.length, `${file}: duplicate lesson in manifest`)
  assert.ok(parsed.modules.every((module) => module.title.length > 0), `${file}: module without title`)
}

// Frontmatter parser reads the schema-critical keys of a real lesson.
const lesson = readFileSync(join(root, 'src/content/lessons/calculus-intro/limits.mdx'), 'utf8')
const front = parseFrontmatter(lesson)
assert.equal(front.course, 'calculus-intro')
assert.ok(Array.isArray(front.prerequisites) && front.prerequisites.length >= 1)
assert.ok(Array.isArray(front.outcomes) && front.outcomes.length >= 1)
assert.ok(Array.isArray(front.omissions) && front.omissions.length >= 1)
assert.ok(/^\d+$/.test(String(front.estimatedMinutes)))

// Routing follows TASKS.md for representative surfaces.
// BASELINE is required for every task but read through AGENTS.md, so it is not listed as a routed pack.
assert.deepEqual(
  route([], 'src/content/lessons/x/y.mdx', 'repair the broken exercises').packs.map((pack) => pack.topic).sort(),
  ['course-work', 'general', 'pedagogy', 'repair', 'standard', 'structure'].sort(),
)
assert.ok(route([], 'src/components/Quiz.tsx', 'restyle the quiz').packs.some((pack) => pack.topic === 'components'))
assert.ok(route([], 'scripts/course_stats.py', 'fix validator').packs.some((pack) => pack.topic === 'validation'))
assert.ok(route([], 'docs/agent-rules/UI.md', 'tighten the UI rule').packs.some((pack) => pack.topic === 'hosts'))
assert.ok(route([], undefined, 'draw the cache hierarchy as PlantUML').packs.some((pack) => pack.topic === 'plantuml'))
assert.equal(packTopic('COURSE_STANDARD'), 'standard')

// Validation tiers: content for lessons, visual for UI surfaces.
const lessonTier = validationTier(route([], 'src/content/lessons/x/y.mdx', 'rewrite').categories, 'src/content/lessons/x/y.mdx')
assert.ok(lessonTier.tier.includes('content') && lessonTier.tier.includes('build'))
const uiTier = validationTier(route([], 'src/components/Quiz.tsx', 'restyle').categories, 'src/components/Quiz.tsx')
assert.ok(uiTier.tier.includes('visual'), 'UI work must route to the visual layer')

// Argument hygiene: no shell metacharacters reach the runner.
assert.equal(sanitizeArgs('operating-systems'), 'operating-systems')
assert.equal(sanitizeArgs('--json reports/integrity.json'), '--json reports/integrity.json')
assert.equal(sanitizeArgs('x; rm -rf /'), undefined)
assert.equal(sanitizeArgs('$(whoami)'), undefined)
assert.equal(sanitizeArgs('--exec evil'), undefined)

// Path hygiene.
assert.equal(repositoryPath('/repo', 'src/a.mdx'), 'src/a.mdx')
assert.equal(repositoryPath('/repo', '/repo/src/a.mdx'), 'src/a.mdx')
assert.equal(repositoryPath('/repo', '../outside'), undefined)
assert.equal(repositoryPath('/repo', '/etc/passwd'), undefined)

console.log('libreuni-work self-check passed')
