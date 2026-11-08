/**
 * LibreUni work: routing, briefing, rule-pack reading, and the repository's own quality gates,
 * offered to every agent in one bundle.
 *
 * - `libreuni_brief` routes a request through `AGENTS.md` -> `docs/agent-rules/TASKS.md`, reads the
 *   routed packs' heading outlines, current manifest and git context, and the smallest useful
 *   validation tier, then seeds the visible todo list.
 * - `libreuni_context` returns one routed rule pack or durable-context document in full.
 * - `libreuni_check` runs a repository validator through `package.json` or its script and returns an
 *   evidence record with the exact command, exit status, and report paths.
 *
 * Repository facts are read on demand from the session working directory. Policy stays in
 * `docs/agent-rules/` and `docs/agent-context/`; validation stays in `package.json` and `scripts/`.
 * This plugin never restates a rule it can point at.
 *
 * @module @libreuni/libreuni-work
 */

const name = 'libreuni-work'

/** Hard dependencies: tool registry, prompt registry, real shell + fs backends, session cwd. */
const inject = ['tools', 'systemPrompt', 'shell', 'fs', 'workingDirectory']

/** Marker line unique to the LibreUni router; used only to report whether the host injected it. */
const ROUTER_MARKER = 'LibreUni agent router'

/** Captured output budget for one validator run. */
const MAX_COMMAND_BYTES = 128 * 1024

/** Sections of a pack whose existence marks a non-trivial pack worth outlining. */
const OUTLINE_LEVEL = 2

/** Full-line rule packs that are always relevant when course work is routed. */
const CHECKS = /** @type {const} */ ({
  content: {
    command: 'npm run check:content',
    timeoutMs: 1_200_000,
    topic: 'content',
    covers: 'Router/package/CI contract, lesson structure, course smoke tests, theme tokens, platform lint, model regressions, PlantUML diagnostics, strict course integrity.',
  },
  build: {
    command: 'npm run check:build',
    timeoutMs: 2_700_000,
    topic: 'build',
    covers: 'Production Astro build, static-path repair, rendered-lesson and course-visual validation, PDF generation.',
  },
  'check:e2e': {
    command: 'npm run check:e2e',
    timeoutMs: 2_700_000,
    topic: 'e2e',
    covers: 'Playwright desktop and mobile smoke plus axe accessibility checks against dist/.',
  },
  'check:ux': {
    command: 'npm run check:ux',
    timeoutMs: 2_700_000,
    topic: 'ux',
    covers: 'Build plus the rendered UX report; fails on hard UX blockers.',
  },
  'check:visual': {
    command: 'npm run test:visual',
    timeoutMs: 2_700_000,
    topic: 'visual',
    covers: 'Build plus Playwright visual captures under reports/visual/ for layout, theme, and styling review.',
  },
  'check:lighthouse': {
    command: 'npm run check:lighthouse',
    timeoutMs: 2_700_000,
    topic: 'lighthouse',
    covers: 'Build plus Lighthouse budgets for accessibility, metadata, performance, and best practices.',
  },
  'check:required': {
    command: 'npm run check:required',
    timeoutMs: 2_700_000,
    topic: 'required',
    covers: 'The pull-request and push gate: check:content, check:build, check:e2e, check:ux in order.',
  },
  'check:full': {
    command: 'npm run check:full',
    timeoutMs: 3_600_000,
    topic: 'full',
    covers: 'Local release gate: check:required plus Lighthouse.',
  },
  'check:contract': {
    command: 'npm run check:contract',
    timeoutMs: 300_000,
    topic: 'contract',
    covers: 'Router/package/CI contract tests, rendered-lesson validator tests, statement-registry test.',
  },
  'test:models': {
    command: 'npm run test:models',
    timeoutMs: 600_000,
    topic: 'models',
    covers: 'Architecture, OS, and database playground model regressions.',
  },
})

/**
 * In-scope validators and stable aliases. Every alias names an existing script; a script that
 * disappears makes the alias report a missing-script error instead of a false pass.
 * @type {Record<string, {command: string, timeoutMs: number, covers: string}>}
 */
const ALIASES = {
  'course-stats': {
    command: 'python3 scripts/course_stats.py',
    timeoutMs: 300_000,
    covers: 'Inventory and smoke tests for every active course, or one course when you append its id.',
  },
  'verify-lessons': {
    command: 'python3 scripts/verify_lessons.py',
    timeoutMs: 300_000,
    covers: 'Strict lesson shell audit for one course directory; append the course id to narrow it.',
  },
  'course-integrity': {
    command: 'python3 scripts/course_integrity.py --strict',
    timeoutMs: 300_000,
    covers: 'Strict padding, duplication, generic-artifact, and heading-coverage audit; append a course id to narrow it.',
  },
  'platform-lint': {
    command: 'node scripts/lint_platform_consistency.mjs',
    timeoutMs: 300_000,
    covers: 'Component and platform-consistency lint across lessons.',
  },
  'course-validators': {
    command: 'python3 scripts/verify_lessons.py && python3 scripts/course_stats.py && python3 scripts/course_integrity.py --strict',
    timeoutMs: 600_000,
    covers: 'The three fast course validators in order, for one-course iteration; check:content remains the full gate.',
  },
}

/** `libreuni_context` topics. */
const TOPICS = /** @type {const} */ ({
  router: { kind: 'file', path: 'AGENTS.md', summary: 'Canonical host-neutral router.' },
  tasks: { kind: 'file', path: 'docs/agent-rules/TASKS.md', summary: 'Task-pack index: which packs each surface requires.' },
  baseline: { kind: 'file', path: 'docs/agent-rules/BASELINE.md', summary: 'Universal operating contract for every task.' },
  general: { kind: 'file', path: 'docs/agent-rules/GENERAL.md', summary: 'Project stack, writing style, component props, banned phrasing.' },
  validation: { kind: 'file', path: 'docs/agent-rules/VALIDATION.md', summary: 'Quality layers, commands, report paths, theme testing.' },
  standard: { kind: 'file', path: 'docs/agent-rules/COURSE_STANDARD.md', summary: 'Mandatory course quality contract.' },
  structure: { kind: 'file', path: 'docs/agent-rules/COURSE_STRUCTURE.md', summary: 'Lesson numbering, statement taxonomy, exercise architecture, manifests.' },
  'course-work': { kind: 'file', path: 'docs/agent-rules/COURSE_WORK.md', summary: 'Course review, redesign, modernization, and repair workflow.' },
  pedagogy: { kind: 'file', path: 'docs/agent-rules/COURSE_PEDAGOGY.md', summary: 'Authoring and auditing requirements for learning design.' },
  integrity: { kind: 'file', path: 'docs/agent-rules/COURSE_INTEGRITY.md', summary: 'Review rules for padding, duplication, and generic artifacts.' },
  repair: { kind: 'file', path: 'docs/agent-rules/COURSE_REPAIR.md', summary: 'Repair workflow and evidence expectations.' },
  components: { kind: 'file', path: 'docs/agent-rules/COURSE_COMPONENTS.md', summary: 'Interactive and rendered component authoring guide.' },
  research: { kind: 'file', path: 'docs/agent-rules/RESEARCH.md', summary: 'Source research, licensing, and citation format.' },
  ui: { kind: 'file', path: 'docs/agent-rules/UI.md', summary: 'Visual identity, accessibility, and visual validation.' },
  plantuml: { kind: 'file', path: 'docs/agent-rules/PLANTUML.md', summary: 'PlantUML authoring and rendering rules.' },
  hosts: { kind: 'file', path: 'docs/agent-rules/HOSTS.md', summary: 'Host adapter policy.' },
  roles: { kind: 'file', path: 'docs/agent-rules/ROLES.md', summary: 'Optional collaboration roles and handoff expectations.' },
  skills: { kind: 'file', path: 'docs/agent-rules/SKILLS.md', summary: 'How host skills fit the repository contract.' },
  decisions: { kind: 'file', path: 'docs/agent-context/DECISIONS.md', summary: 'Accepted durable decisions.' },
  constraints: { kind: 'file', path: 'docs/agent-context/KNOWN-CONSTRAINTS.md', summary: 'Verified constraints affecting future work.' },
  handoff: { kind: 'file', path: 'docs/agent-context/HANDOFF.md', summary: 'Current bounded handoff, when work continues across sessions.' },
  'agent-context': { kind: 'file', path: 'docs/agent-context/README.md', summary: 'Durable-context rules: what belongs and what never does.' },
  components_list: { kind: 'list', dir: 'src/components', summary: 'Rendered and interactive components available to lessons.' },
  courses: { kind: 'courses', summary: 'Active courses with lesson counts and lesson files not listed in the manifest.' },
})

/** Task categories accepted by `libreuni_brief`. */
const CATEGORIES = /** @type {const} */ (['course', 'component', 'research', 'ui', 'plantuml', 'agents', 'tooling', 'docs'])

// ---------------------------------------------------------------------------
// Path and text helpers
// ---------------------------------------------------------------------------

/**
 * Join a repository-relative path onto a root directory.
 * @param {string} root
 * @param {string} relative
 * @returns {string}
 */
function joinPath(root, relative) {
  const base = root.endsWith('/') ? root : `${root}/`
  return relative.length === 0 ? base : `${base}${relative.replace(/^\.?\//, '')}`
}

/**
 * Normalize a tool-supplied path to a repository-relative POSIX path.
 * @param {string} root
 * @param {string} input
 * @returns {string | undefined} undefined when the path escapes the repository
 */
export function repositoryPath(root, input) {
  const trimmed = String(input ?? '').trim().replace(/^\.\//, '')
  if (trimmed.length === 0) return undefined
  if (trimmed.startsWith('/') || /^[A-Za-z]:[\\/]/.test(trimmed)) {
    const prefix = root.endsWith('/') ? root : `${root}/`
    if (!trimmed.startsWith(prefix)) return undefined
    return trimmed.slice(prefix.length)
  }
  const parts = []
  for (const part of trimmed.split(/[\\/]+/)) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (parts.length === 0) return undefined
      parts.pop()
      continue
    }
    parts.push(part)
  }
  return parts.length === 0 ? undefined : parts.join('/')
}

/**
 * Render an arbitrary value as text for a tool result.
 * @param {unknown} value
 * @returns {string}
 */
function asText(value) {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return JSON.stringify(value)
}

/**
 * Read heading outline entries at or above a level.
 * @param {string} markdown
 * @param {number} [maxLevel]
 * @returns {Array<{level: number, title: string}>}
 */
export function outline(markdown, maxLevel = OUTLINE_LEVEL) {
  const found = []
  let fenced = false
  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced
      continue
    }
    if (fenced) continue
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
    if (match === null) continue
    const level = match[1].length
    if (level <= maxLevel) found.push({ level, title: match[2] })
  }
  return found
}

/**
 * @param {Array<{level: number, title: string}>} entries
 * @param {string} [indent]
 * @returns {string}
 */
function formatOutline(entries, indent = '') {
  return entries.map((entry) => `${indent}${'  '.repeat(entry.level - 1)}- ${entry.title}`).join('\n')
}

/**
 * @param {string} value
 * @returns {string}
 */
function unquote(value) {
  return String(value ?? '').trim().replace(/^['"]|['"]$/g, '')
}

/**
 * @param {string} value
 * @returns {string[]}
 */
function flowList(value) {
  const trimmed = value.trim()
  if (!trimmed.startsWith('[')) return trimmed.length > 0 ? [unquote(trimmed)] : []
  return trimmed.replace(/^\[/, '').replace(/\]$/, '').split(',').map(unquote).filter((entry) => entry.length > 0)
}

/**
 * Parse a course manifest (`modules: - title/questions/lessons`) without a YAML dependency.
 * Supports the block style used in `src/data/course-manifests/` and flat flow lists.
 * @param {string} source
 * @returns {{modules: Array<{title: string, question?: string, lessons: string[]}>, lessons: string[]}}
 */
export function parseManifest(source) {
  /** @type {Array<{title: string, question?: string, lessons: string[]}>} */
  const modules = []
  /** @type {{title: string, question?: string, lessons: string[]} | undefined} */
  let current
  // Indentation of the `- title:` that opened the current module.
  let moduleIndent = -1
  const ensure = () => {
    if (current === undefined) {
      current = { title: '', lessons: [] }
      modules.push(current)
    }
    return current
  }
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.replace(/^[ \t]*#.*$/, '')
    if (line.trim().length === 0) continue
    const flat = /^[ \t]*modules[ \t]*:[ \t]*\[(.*)\][ \t]*$/.exec(line)
    if (flat !== null) {
      ensure().lessons.push(...flowList(flat[1]))
      continue
    }
    const opener = /^([ \t]*)-[ \t]+title[ \t]*:[ \t]*(.*)$/.exec(line)
    // The first `- title:` opens a module; later ones at or left of it start a sibling.
    if (opener !== null && (current === undefined || opener[1].length <= moduleIndent)) {
      current = { title: unquote(opener[2]), lessons: [] }
      modules.push(current)
      moduleIndent = opener[1].length
      continue
    }
    const field = /^[ \t]*(question|lessons|role)[ \t]*:[ \t]*(.*)$/.exec(line)
    if (field !== null) {
      const target = ensure()
      if (field[1] === 'lessons') target.lessons.push(...flowList(field[2]))
      else if (field[1] === 'question') target.question = unquote(field[2])
      continue
    }
    const item = /^[ \t]*-(?:[ \t]+(.*))?$/.exec(line)
    if (item !== null) ensure().lessons.push(...flowList(item[1] ?? ''))
  }
  return { modules: modules.filter((entry) => entry.title.length > 0 || entry.lessons.length > 0), lessons: modules.flatMap((entry) => entry.lessons) }
}

/**
 * Parse lesson frontmatter into the flat shapes the content schema uses.
 * @param {string} source
 * @returns {Record<string, string | string[] | Array<Record<string, string>>>}
 */
export function parseFrontmatter(source) {
  /** @type {Record<string, string | string[] | Array<Record<string, string>>>} */
  const data = {}
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source)
  if (match === null) return data
  /** @type {string | undefined} */
  let listKey
  for (const raw of match[1].split(/\r?\n/)) {
    if (raw.trim().length === 0 || /^\s*#/.test(raw)) continue
    const top = /^([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(raw)
    if (top !== null) {
      const [, key, value] = top
      const flow = /^\[(.*)\]$/.exec(value.trim())
      listKey = value.trim().length === 0 || flow !== null ? key : undefined
      data[key] = value.trim().length === 0 ? [] : flow !== null ? flowList(value) : unquote(value)
      continue
    }
    const item = /^\s*-\s+(.*)$/.exec(raw)
    if (item === null || listKey === undefined) continue
    const list = data[listKey]
    if (!Array.isArray(list)) continue
    const pair = /^([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(item[1])
    if (pair === null) {
      list.push(unquote(item[1]))
      continue
    }
    const last = list[list.length - 1]
    if (last !== undefined && typeof last === 'object' && !Array.isArray(last)) last[pair[1]] = unquote(pair[2])
    else list.push({ [pair[1]]: unquote(pair[2]) })
  }
  return data
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function asList(value) {
  if (Array.isArray(value)) return value.map((entry) => (typeof entry === 'string' ? entry : JSON.stringify(entry)))
  return typeof value === 'string' && value.length > 0 ? [value] : []
}

// ---------------------------------------------------------------------------
// Repository access
// ---------------------------------------------------------------------------

/**
 * Session-scoped repository facts. Nothing is cached across root changes except the directory check.
 */
class Repository {
  /**
   * @param {any} ctx
   */
  constructor(ctx) {
    this.ctx = ctx
    /** @type {Map<string, boolean>} */
    this.recognized = new Map()
  }

  /**
   * @param {any} agent
   * @param {AbortSignal | undefined} signal
   * @returns {Promise<{root: string} | {error: string}>}
   */
  async rootOf(agent, signal) {
    if (agent === undefined || agent === null) return { error: 'This tool needs an owning agent session to locate the repository.' }
    let directory
    try {
      directory = this.ctx.workingDirectory.get(agent.session)
    } catch (error) {
      return { error: `The session directory is unavailable: ${error instanceof Error ? error.message : String(error)}` }
    }
    if (typeof directory !== 'string' || directory.length === 0) return { error: 'The session has no working directory.' }
    const known = this.recognized.get(directory)
    if (known === true) return { root: directory }
    const router = await this.read(joinPath(directory, 'AGENTS.md'), signal)
    if (router !== undefined && router.includes(ROUTER_MARKER)) {
      this.recognized.set(directory, true)
      return { root: directory }
    }
    const lessons = await this.read(joinPath(directory, 'src/content.config.ts'), signal)
    if (lessons !== undefined) {
      this.recognized.set(directory, true)
      return { root: directory }
    }
    this.recognized.set(directory, false)
    return {
      error: `The session directory ${directory} is not a LibreUni checkout: no AGENTS.md router and no src/content.config.ts. Change the working directory to the repository first.`,
    }
  }

  /**
   * @param {string} path
   * @param {AbortSignal | undefined} signal
   * @returns {Promise<string | undefined>}
   */
  async read(path, signal) {
    try {
      const target = await this.ctx.fs.resolve(path, { signal })
      return await this.ctx.fs.readText(target, signal)
    } catch {
      return undefined
    }
  }

  /**
   * @param {string} path
   * @param {AbortSignal | undefined} signal
   * @returns {Promise<Array<{name: string, type: string}>>}
   */
  async list(path, signal) {
    try {
      const target = await this.ctx.fs.resolve(path, { signal })
      const entries = await this.ctx.fs.listDir(target, signal)
      return entries.map((entry) => ({ name: String(entry.name), type: String(entry.type) })).sort((a, b) => a.name.localeCompare(b.name))
    } catch {
      return []
    }
  }

  /**
   * Run one shell command with bounded capture.
   * @param {string} command
   * @param {number} timeoutMs
   * @param {AbortSignal} signal
   */
  /**
   * @param {string} command
   * @param {number} timeoutMs
   * @param {AbortSignal} signal
   * @param {{captured?: boolean}} [options] `captured: false` leaves the command to the executor's
   *   default (login) shell for validators whose stdout is re-shown to the user with its usual shell;
   *   `captured: true` runs it under a fresh `/bin/sh` whose stdout is parsed.
   */
  async run(command, timeoutMs, signal, options = {}) {
    const startedAt = Date.now()
    const captured = options.captured === true
    try {
      const spec = this.ctx.shell.resolve({
        // Parsed output must not carry login-shell prompt hooks from the user's dotfiles.
        command: captured ? `exec /bin/sh -c ${shellQuote(command)}` : command,
        timeoutMs,
        onExpiry: 'kill',
        stdoutMaxBytes: MAX_COMMAND_BYTES,
        signal,
      })
      const execution = await this.ctx.shell.execute(spec)
      const result = await execution.result()
      return {
        command,
        exitCode: result.exitCode,
        timedOut: result.timedOut,
        aborted: result.aborted,
        stdout: result.stdout.text,
        stderr: result.stderr.text,
        truncated: result.stdout.truncated === true || result.stderr.truncated === true,
        durationMs: Date.now() - startedAt,
        sandbox: result.sandbox,
      }
    } catch (error) {
      return {
        command,
        exitCode: null,
        timedOut: false,
        aborted: signal.aborted,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        truncated: false,
        durationMs: Date.now() - startedAt,
        sandbox: undefined,
      }
    }
  }

  /**
   * Branch and porcelain status. Failures are reported, never treated as clean.
   * @param {string} root
   * @param {AbortSignal} signal
   */
  async git(root, signal) {
    const [branch, status] = await Promise.all([
      this.run(`git -C ${shellQuote(root)} rev-parse --abbrev-ref HEAD`, 20_000, signal, { captured: true }),
      this.run(`git -C ${shellQuote(root)} status --porcelain=v1 -z --untracked-files=all`, 30_000, signal, { captured: true }),
    ])
    if (status.exitCode !== 0) return { error: (status.stderr || status.stdout || 'git status failed').trim().split('\n')[0] }
    const entries = status.stdout
      .split('\0')
      .filter((entry) => entry.length > 3 && /^[ MADRCU?!]{2} /.test(entry) && !entry.includes('\n'))
      .map((entry) => ({ status: entry.slice(0, 2).trim() || '??', path: entry.slice(3) }))
    return {
      branch: branch.exitCode === 0 ? branch.stdout.trim() : 'detached',
      entries,
    }
  }

  /**
   * @param {string} root
   * @param {AbortSignal} signal
   * @returns {Promise<Array<{id: string, lessons: Array<{slug: string, file: string, title?: string, onDisk: boolean}>, unlisted: string[]}>>}
   */
  async courses(root, signal) {
    const manifests = (await this.list(joinPath(root, 'src/data/course-manifests'), signal)).filter((entry) => entry.type === 'file' && entry.name.endsWith('.yml')).map((entry) => entry.name)
    const lessonDirs = await this.list(joinPath(root, 'src/content/lessons'), signal)
    const directories = new Set(lessonDirs.filter((entry) => entry.type === 'directory').map((entry) => entry.name))
    const ids = [...new Set([...manifests.map((manifest) => manifest.slice(0, -4)), ...directories])].sort()
    const courses = []
    for (const id of ids) {
      const source = manifests.includes(`${id}.yml`) ? await this.read(joinPath(root, `src/data/course-manifests/${id}.yml`), signal) : undefined
      const parsed = source === undefined ? { modules: [], lessons: [] } : parseManifest(source)
      const files = (await this.list(joinPath(root, `src/content/lessons/${id}`), signal)).filter((entry) => entry.type === 'file' && /\.mdx?$/.test(entry.name)).map((entry) => entry.name)
      const listed = new Set(parsed.lessons)
      const lessons = []
      for (const slug of parsed.lessons) {
        const file = files.find((entry) => entry.replace(/\.mdx?$/, '') === slug) ?? `${slug}.mdx`
        const present = files.includes(file)
        const frontmatter = present ? parseFrontmatter((await this.read(joinPath(root, `src/content/lessons/${id}/${file}`), signal)) ?? '') : {}
        const title = typeof frontmatter.title === 'string' ? frontmatter.title : undefined
        lessons.push({ slug, file, ...(title !== undefined ? { title } : {}), onDisk: present })
      }
      const unlisted = files.filter((entry) => !listed.has(entry.replace(/\.mdx?$/, '')))
      courses.push({ id, lessons, unlisted })
    }
    return courses
  }
}

/**
 * Quote one value as a single POSIX shell word.
 * @param {string} value
 * @returns {string}
 */
function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`
}

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

/** Packs each task category requires, with the reason attached. */
const CATEGORY_PACKS = /** @type {Record<string, {always: string[], conditional?: string, why: string}>} */ ({
  course: {
    always: ['GENERAL', 'COURSE_STANDARD', 'COURSE_STRUCTURE', 'COURSE_WORK'],
    conditional: 'COURSE_PEDAGOGY for authoring/audit, COURSE_INTEGRITY for content review, COURSE_REPAIR for repairs, RESEARCH/UI/PLANTUML by surface',
    why: 'course, module, lesson, manifest, assessment',
  },
  component: {
    always: ['GENERAL', 'COURSE_STANDARD', 'COURSE_STRUCTURE', 'COURSE_WORK', 'COURSE_COMPONENTS'],
    conditional: 'UI for behavior, styling, or accessibility',
    why: 'interactive or rendered course component',
  },
  research: { always: ['RESEARCH'], conditional: 'course packs when the material is written into a lesson', why: 'new facts, sources, explanations, citations' },
  ui: { always: ['UI', 'VALIDATION'], conditional: 'the subject pack of the surface being styled', why: 'layout, styling, theme, interaction, accessibility' },
  plantuml: { always: ['PLANTUML'], conditional: 'course packs when the diagram belongs to a lesson', why: 'PlantUML source or rendering' },
  agents: { always: ['HOSTS', 'VALIDATION'], conditional: 'docs/agent-context/README.md for durable-context changes', why: 'agent routing, host adapters, roles, durable context' },
  tooling: { always: ['VALIDATION'], conditional: 'the subject pack of affected content, UI, or rendering', why: 'scripts, package commands, CI, tests, deployment' },
  docs: { always: [], why: 'documentation-only work' },
})

/** Paths whose surface implies a category (first match wins). */
const PATH_RULES = [
  { pattern: /^src\/content\/lessons\//, category: 'course' },
  { pattern: /^src\/data\/course-manifests\//, category: 'course' },
  { pattern: /^src\/content\/courses\//, category: 'course' },
  { pattern: /^docs\/curriculum\/|^docs\/refactor\//, category: 'course' },
  { pattern: /\.puml$/, category: 'plantuml' },
  { pattern: /^src\/components\//, category: 'component' },
  { pattern: /\.(css|astro)$|^tailwind\.config|^src\/styles\//, category: 'ui' },
  { pattern: /^(docs\/agent-rules\/|docs\/agent-context\/|AGENTS\.md$|CODEX\.md$|GEMINI\.md$|opencode\.json$|\.github\/copilot-instructions\.md$)/, category: 'agents' },
  { pattern: /^(scripts\/|tools\/|tests\/|\.github\/workflows\/|package\.json$|playwright\.config|astro\.config|lighthouserc)/, category: 'tooling' },
  { pattern: /^docs\//, category: 'docs' },
]

/**
 * @param {string} packFile e.g. `COURSE_STANDARD`
 * @returns {string} topic key for `libreuni_context`
 */
export function packTopic(packFile) {
  const byFile = Object.entries(TOPICS).find(([, entry]) => entry.kind === 'file' && entry.path === `docs/agent-rules/${packFile}.md`)
  if (byFile !== undefined) return byFile[0]
  return packFile.toLowerCase().replace(/^course_/, '')
}

/**
 * Derive the routing for one request.
 * @param {string[]} categories requested categories
 * @param {string | undefined} path repository path under work
 * @param {string} request request text
 * @returns {{categories: string[], packs: Array<{topic: string, file: string, why: string}>, conditional: string[]}}
 */
export function route(categories, path, request) {
  const chosen = new Set(categories.filter((entry) => CATEGORIES.includes(entry)))
  if (path !== undefined) {
    for (const rule of PATH_RULES) {
      if (rule.pattern.test(path)) {
        chosen.add(rule.category)
        break
      }
    }
  }
  const lower = request.toLowerCase()
  if (/\b(plantuml|puml|diagram|sequence diagram|class diagram|state diagram)\b/.test(lower)) chosen.add('plantuml')
  if (/\b(style|styling|css|layout|theme|dark mode|light mode|accessib|responsive|visual|customiz)\b/.test(lower)) chosen.add('ui')
  if (/\b(cite|citation|citations|source|sources|research|reference|references|bibliograph)\b/.test(lower)) chosen.add('research')
  if (chosen.size === 0) chosen.add('docs')

  /** @type {Array<{topic: string, file: string, why: string}>} */
  const packs = []
  /** @type {string[]} */
  const conditional = []
  const add = (packFile, why) => {
    const topic = packTopic(packFile)
    if (packs.some((entry) => entry.topic === topic)) return
    packs.push({ topic, file: `docs/agent-rules/${packFile}.md`, why })
  }
  for (const category of [...chosen].sort()) {
    const definition = CATEGORY_PACKS[category]
    if (definition === undefined) continue
    for (const packFile of definition.always) add(packFile, `${definition.why} (TASKS.md)`)
    if (definition.conditional !== undefined && !conditional.includes(definition.conditional)) conditional.push(definition.conditional)
  }
  const courseWork = chosen.has('course') || chosen.has('component')
  if (courseWork) {
    const rules = /** @type {const} */ ([
      ['COURSE_PEDAGOGY', /\b(author|write|draft|audit|pedagog\w*|teach\w*|learn\w*|moderni[sz]\w*|rewrite|redesign|exercise\w*|assess\w*|improve)\b/],
      ['COURSE_INTEGRITY', /\b(review|integrity|audit|padding|duplicat\w*|filler)\b/],
      ['COURSE_REPAIR', /\b(fix|repair|broken|failing|restore|regression)\b/],
    ])
    for (const [packFile, pattern] of rules) if (pattern.test(lower)) add(packFile, 'selected by the request wording (TASKS.md)')
  }
  return {
    categories: [...chosen].sort(),
    packs,
    // Keep only guidance that names a surface, or a pack, that is not already routed.
    conditional: conditional.map((line) => unsettledParts(line, packs)).filter((line) => line.length > 0),
  }
}

/**
 * Drop the fragments of one conditional line whose packs are already routed.
 * @param {string} line
 * @param {Array<{topic: string}>} packs
 * @returns {string}
 */
function unsettledParts(line, packs) {
  const routed = new Set(packs.map((pack) => pack.topic))
  return line
    .split(/,\s*(?=[A-Z])/)
    .filter((part) => {
      const named = [...part.matchAll(/\b(COURSE_[A-Z_]+|RESEARCH|UI|PLANTUML|HOSTS|VALIDATION)\b/g)].map((match) => packTopic(match[0]))
      if (named.length === 0) return true
      return !named.every((topic) => routed.has(topic))
    })
    .join(', ')
}

/**
 * Durable-context documents list their entries as bold lead-ins (`**D-0001 — Title.**`, `**Verified date:**`,
 * `**Start at:**`); fall back to those so the briefing names what each file holds.
 * @param {string} markdown
 * @returns {Array<{level: number, title: string}>}
 */
function contextEntries(markdown) {
  const entries = []
  let fenced = false
  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced
      continue
    }
    if (fenced) continue
    const heading = /^##+\s+(.+?)\s*$/.exec(line)
    if (heading !== null) {
      entries.push({ level: 1, title: heading[1] })
      continue
    }
    const bold = /^\*\*(.{3,120}?)[.:]?\*\*/.exec(line.trim())
    if (bold !== null && !/[.!?]$/.test(bold[1])) entries.push({ level: 2, title: bold[1] })
  }
  return entries
}

/**
 * Smallest validation tier that covers the touched surface, per VALIDATION.md.
 * @param {string[]} categories
 * @param {string | undefined} path
 * @returns {{tier: string[], notes: string[]}}
 */
export function validationTier(categories, path) {
  const has = (entry) => categories.includes(entry)
  const uiSurface = has('ui') || has('component') || (path !== undefined && /\.(css|astro)$/.test(path))
  const courseSurface = has('course') || has('component')
  const tier = new Set()
  const notes = []
  if (courseSurface || has('tooling')) tier.add('content')
  if (courseSurface || has('docs') || has('plantuml') || has('tooling') || has('agents')) tier.add('build')
  if (uiSurface || courseSurface || has('tooling')) {
    tier.add('e2e')
    tier.add('ux')
  }
  if (uiSurface) {
    tier.add('visual')
    notes.push('Layout, styling, theme, interaction, or accessibility work requires `check:visual` and inspection of `reports/visual/` (VALIDATION.md).')
  }
  if (tier.size === 0) tier.add('build')
  if (courseSurface) notes.push('A passing `check:content` proves structural validity only; pedagogy, correctness, and sourcing still require review under COURSE_PEDAGOGY.md.')
  if (has('agents')) notes.push('Durable context may change only for verified facts in DECISIONS.md, KNOWN-CONSTRAINTS.md, or HANDOFF.md (docs/agent-context/README.md).')
  const order = ['content', 'build', 'e2e', 'ux', 'visual']
  return { tier: [...tier].sort((a, b) => order.indexOf(a) - order.indexOf(b)), notes }
}

// ---------------------------------------------------------------------------
// Briefing
// ---------------------------------------------------------------------------

/**
 * Read a repo file's heading outline, reporting absence honestly.
 * @param {Repository} repository
 * @param {string} root
 * @param {string} relative
 * @param {AbortSignal} signal
 */
async function packOutline(repository, root, relative, signal) {
  const source = await repository.read(joinPath(root, relative), signal)
  if (source === undefined) return undefined
  return outline(source)
}

/**
 * @param {Object} input
 * @param {Repository} repository
 * @param {string} root
 * @param {AbortSignal} signal
 */
async function buildBriefing(input, repository, root, signal) {
  const request = String(input.request ?? '').trim()
  if (request.length === 0) throw new Error('`request` must describe the task in one line.')
  const path = input.path === undefined ? undefined : repositoryPath(root, input.path)
  if (input.path !== undefined && path === undefined) throw new Error(`\`path\` must be inside the repository: ${String(input.path)}`)
  const courseId = typeof input.course === 'string' && input.course.trim().length > 0 ? input.course.trim() : undefined
  const categories = Array.isArray(input.categories) ? input.categories.map(String) : []
  const routing = route(categories, path, request)
  const tier = validationTier(routing.categories, path)

  const packs = []
  for (const pack of routing.packs) {
    const entries = await packOutline(repository, root, pack.file, signal)
    packs.push({ ...pack, ...(entries !== undefined ? { outline: entries } : {}), present: entries !== undefined })
  }

  const durable = []
  for (const topic of ['decisions', 'constraints', 'handoff']) {
    const entry = TOPICS[topic]
    if (entry === undefined || entry.kind !== 'file') continue
    const source = await repository.read(joinPath(root, entry.path), signal)
    if (source === undefined) continue
    const headings = outline(source, 1).length > 1 ? outline(source, 1) : contextEntries(source)
    const bytes = source.length
    durable.push({ topic, path: entry.path, summary: entry.summary, bytes, headings: headings.slice(0, 40), headingCount: headings.length })
  }

  const [git, courses, scriptsRaw, validationDoc] = await Promise.all([
    repository.git(root, signal),
    repository.courses(root, signal),
    repository.read(joinPath(root, 'package.json'), signal),
    repository.read(joinPath(root, 'docs/agent-rules/VALIDATION.md'), signal),
  ])

  /** @type {Array<{name: string, command: string}>} */
  let scripts = []
  try {
    scripts = Object.entries(JSON.parse(scriptsRaw ?? '{}').scripts ?? {}).map(([key, value]) => ({ name: key, command: String(value) }))
  } catch {
    scripts = []
  }

  // Live course context: every course when one is not named, the named course otherwise.
  const courseContext = []
  const selected = courseId === undefined ? courses : courses.filter((course) => course.id === courseId)
  if (courseId !== undefined && selected.length === 0) {
    throw new Error(`Unknown course \`${courseId}\`. Known: ${courses.map((course) => course.id).join(', ')}.`)
  }
  for (const course of selected) {
    const diskCount = course.lessons.filter((lesson) => lesson.onDisk).length
    courseContext.push({
      id: course.id,
      manifestPath: `src/data/course-manifests/${course.id}.yml`,
      lessonCount: course.lessons.length,
      missingFiles: course.lessons.filter((lesson) => !lesson.onDisk).map((lesson) => lesson.slug),
      unlistedFiles: course.unlisted,
      ...(courseId !== undefined
        ? {
            lessons: course.lessons.map((lesson) => ({
              slug: lesson.slug,
              file: `src/content/lessons/${course.id}/${lesson.file}`,
              ...(lesson.title !== undefined ? { title: lesson.title } : {}),
              onDisk: lesson.onDisk,
            })),
          }
        : { unlistedFiles: diskCount === 0 ? course.unlisted : course.unlisted }),
    })
  }

  return { request, path, routing, tier, packs, durable, git, scripts, courses: courseContext, courseId, validationReportPaths: reportPaths(routing.categories, tier.tier), validationDoc: validationDoc !== undefined }
}

/**
 * Report directories the validation layers write, taken from VALIDATION.md's contract.
 * @param {string[]} categories
 * @param {string[]} tier
 * @returns {string[]}
 */
function reportPaths(categories, tier) {
  const paths = new Set()
  if (tier.includes('e2e') || tier.includes('ux') || categories.includes('ui')) paths.add('reports/playwright')
  if (tier.includes('ux') || categories.includes('ui')) paths.add('reports/ux')
  if (tier.includes('visual')) paths.add('reports/visual')
  if (tier.includes('check:full') || tier.includes('check:lighthouse')) paths.add('reports/lighthouse')
  paths.add('reports')
  return [...paths]
}

/**
 * Conditional guidance whose packs are already routed adds noise, so it is dropped from the brief.
 * @param {Awaited<ReturnType<typeof buildBriefing>>} briefing
 * @returns {string[]}
 */
function conditionalLeft(briefing) {
  return briefing.routing.conditional
}

/**
 * @param {Awaited<ReturnType<typeof buildBriefing>>} briefing
 * @returns {string}
 */
function renderBriefing(briefing) {
  const lines = []
  lines.push(`# LibreUni brief: ${briefing.request}`)
  lines.push('')
  lines.push(`Categories: ${briefing.routing.categories.join(', ')}${briefing.path !== undefined ? ` · path: ${briefing.path}` : ''}`)
  lines.push('')
  lines.push('## Read next (in this order)')
  let index = 1
  for (const pack of briefing.packs) {
    if (!pack.present) {
      lines.push(`${index}. ${pack.file} (missing on disk; report this instead of inventing the rule)`)
      index += 1
      continue
    }
    lines.push(`${index}. \`libreuni_context\` topic \`${pack.topic}\` -> ${pack.file}`)
    if (pack.outline !== undefined && pack.outline.length > 0) lines.push(formatOutline(pack.outline, '   '))
    index += 1
  }
  if (briefing.packs.length === 0) lines.push('1. No rule pack is routed; read `docs/agent-rules/BASELINE.md` (topic `baseline`) before editing.')
  const conditional = conditionalLeft(briefing)
  if (conditional.length > 0) {
    lines.push('')
    lines.push('Add when applicable:')
    for (const entry of conditional) lines.push(`- ${entry}`)
  }

  lines.push('')
  lines.push('## Durable context')
  if (briefing.durable.length === 0) lines.push('- No durable-context files found.')
  for (const entry of briefing.durable) {
    lines.push(`- \`${entry.topic}\` -> ${entry.path} (${entry.headingCount} entries, ${entry.bytes} bytes): ${entry.summary}`)
    for (const heading of entry.headings.slice(0, 12)) lines.push(`  - ${heading.title}`)
    if (entry.headings.length > 12) lines.push(`  - … ${entry.headingCount - 12} more; read the file`)
  }

  lines.push('')
  lines.push('## Validation tier')
  lines.push(`Run: ${briefing.tier.tier.map((entry) => `\`libreuni_check\` topic \`${entry}\``).join(', ')}`)
  for (const note of briefing.tier.notes) lines.push(`- ${note}`)
  lines.push(`- Reports appear under ${briefing.validationReportPaths.map((entry) => `\`${entry}\``).join(', ')}; inspect them where VALIDATION.md requires review.`)

  lines.push('')
  lines.push('## Repository commands (from package.json)')
  for (const script of briefing.scripts.filter((entry) => /^(check:|test|build|dev)/.test(entry.name))) lines.push(`- \`npm run ${script.name}\` — ${script.command}`)

  lines.push('')
  lines.push('## Working tree')
  if (briefing.git === undefined || 'error' in briefing.git) lines.push(`- git unavailable: ${briefing.git?.error ?? 'unknown error'}`)
  else {
    lines.push(`- Branch: ${briefing.git.branch} · ${briefing.git.entries.length} changed path(s)`)
    for (const entry of briefing.git.entries.slice(0, 60)) lines.push(`  - ${entry.status} ${entry.path}`)
    if (briefing.git.entries.length > 60) lines.push(`  - … ${briefing.git.entries.length - 60} more`)
    if (briefing.git.entries.length > 0) lines.push('- Preserve these unrelated changes; never revert or stage them unless asked.')
  }

  if (briefing.courses.length > 0) {
    lines.push('')
    lines.push('## Courses')
    for (const course of briefing.courses) {
      lines.push(`- ${course.id}: ${course.lessonCount} manifest lessons (${course.manifestPath})`)
      if (course.missingFiles.length > 0) lines.push(`  - manifest entries with no lesson file: ${course.missingFiles.join(', ')}`)
      if (course.unlistedFiles.length > 0) lines.push(`  - lesson files not in the manifest: ${course.unlistedFiles.join(', ')}`)
      for (const lesson of course.lessons ?? []) lines.push(`  - ${lesson.onDisk ? '' : 'missing '}${lesson.slug}${lesson.title !== undefined ? ` — ${lesson.title}` : ''} (${lesson.file})`)
    }
  }
  return lines.join('\n')
}

/**
 * Todo list seeded at briefing time so the user sees the plan in the UI. Content stays in the
 * model's ordinary todo format; the leading tag makes the seed idempotent across turns.
 * @param {ReturnType<typeof buildBriefing> extends Promise<infer T> ? T : never} briefing
 * @param {string} request
 * @returns {{content: string, status: string}[]}
 */
export function seedTodos(briefing, request) {
  const summary = request.length > 60 ? `${request.slice(0, 57)}…` : request
  const packs = briefing.packs.filter((pack) => pack.present).map((pack) => pack.file.replace('docs/agent-rules/', '').replace(/\.md$/, ''))
  return [
    { content: `[${ROUTER_MARKER}] Plan: ${summary}`, status: 'in_progress' },
    {
      content: `Read routed packs (${packs.length === 0 ? 'BASELINE' : packs.join(', ')}) and relevant durable context`,
      status: 'pending',
    },
    { content: 'Inspect targets and existing changes; state assumptions before editing', status: 'pending' },
    { content: 'Make the scoped change and re-read the diff', status: 'pending' },
    {
      content: `Run ${briefing.tier.tier.map((entry) => `\`${entry}\``).join(', ')} with libreuni_check${briefing.tier.tier.includes('check:visual') ? ' and inspect reports/visual/' : ''}`,
      status: 'pending',
    },
    { content: 'Hand off: files changed, checks run with real outcomes, remaining risk', status: 'pending' },
  ]
}

// ---------------------------------------------------------------------------
// Fixture-free unit surface for maintainers of this plugin
// ---------------------------------------------------------------------------

/**
 * Self-check used by `plugins/libreuni-work/test.mjs`; pure, no runtime needed.
 * @returns {string[]} failure messages
 */
export function selfCheck() {
  const failures = []
  const manifest = parseManifest(`modules:
- title: Limits
  question: How?
  lessons: [a, b]
- title: Integration
  lessons:
    - c
    - d
`)
  if (manifest.lessons.join(',') !== 'a,b,c,d') failures.push(`parseManifest flow/list: ${JSON.stringify(manifest.lessons)}`)
  if (manifest.modules.length !== 2) failures.push(`parseManifest modules: ${manifest.modules.length}`)
  const front = parseFrontmatter(`---\ntitle: Limits\nprerequisites:\n  - One\n  - Two\noutcomes:\n  - A long enough outcome\n---\n# Body`)
  if (front.title !== 'Limits') failures.push(`frontmatter title: ${JSON.stringify(front.title)}`)
  if (asList(front.prerequisites).length !== 2) failures.push('frontmatter list length')
  const routed = route([], 'src/content/lessons/x/y.mdx', 'Rewrite the lesson on limits')
  if (!routed.categories.includes('course')) failures.push('route: lesson path is not course work')
  if (!routed.packs.some((pack) => pack.topic === 'standard')) failures.push('route: COURSE_STANDARD missing')
  const ui = validationTier(route([], 'src/components/Quiz.tsx', 'restyle').categories, 'src/components/Quiz.tsx')
  if (!ui.tier.includes('visual')) failures.push('validation: component change lacks the visual layer')
  if (repositoryPath('/repo', '../etc/passwd') !== undefined) failures.push('repositoryPath accepted an escape')
  if (repositoryPath('/repo', 'src/a.mdx') !== 'src/a.mdx') failures.push('repositoryPath relative')
  if (repositoryPath('/repo', '/repo/src/a.mdx') !== 'src/a.mdx') failures.push('repositoryPath absolute inside root')
  if (repositoryPath('/repo', '/etc/passwd') !== undefined) failures.push('repositoryPath accepted absolute outside root')
  return failures
}
// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

/**
 * The routing section. It states the protocol once and points at the repository's documents;
 * policy text stays in the routed files.
 * @returns {string}
 */
export function routingSection() {
  return [
    'This session works in the LibreUni repository. `AGENTS.md` is the canonical router; the rule packs under `docs/agent-rules/` override host habits, and no skill, subagent, or adapter may bypass them.',
    '',
    'Repository work protocol:',
    '1. Call `libreuni_brief` once before the first repository edit, and again when the request changes surface. It returns the routed packs with their heading outlines, course and git facts, the smallest useful validation tier, and the commands that exist in `package.json` today.',
    '2. Read each listed pack with `libreuni_context` before editing. Read `decisions`, `constraints`, and `handoff` for non-trivial work.',
    '3. Use `libreuni_check` for repository validators; it returns the exact command, exit status, and report paths. Inspect generated reports yourself where a rule requires review.',
    '4. Report only checks that actually ran, with their real outcome.',
    '',
    'Skip the briefing only for read-only questions that touch no repository file.',
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

/**
 * @param {Repository} repository
 * @param {{briefTodoSeed: boolean}} options
 * @returns {any[]}
 */
function definitions(repository, options) {
  /** @type {any[]} */
  const tools = []

  tools.push({
    name: 'libreuni_brief',
    description:
      'Route a LibreUni task before editing: reads AGENTS.md, docs/agent-rules/TASKS.md, the routed packs, durable context, course manifests, and git state, then returns the packs to read, the validation tier, available commands, and a todo plan. Call once at the start of any task that edits the repository, and again when the task changes surface.',
    parameters: {
      request: {
        type: 'string',
        required: true,
        description: 'The task in one line, in the user\'s words (for example "rewrite the paging lesson exercises").',
      },
      path: {
        type: 'string',
        description: 'Repository-relative path, or directory, that the work touches. Improves routing when the request is terse.',
      },
      course: {
        type: 'string',
        description: 'Course id when the work targets one course (for example `operating-systems`). Adds that course\'s manifest lessons and file state.',
      },
      categories: {
        type: 'array',
        description: 'Task categories known up front; inferred from `path` and `request` otherwise.',
        items: { type: 'string', enum: [...CATEGORIES] },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          text: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: value.text }],
    },
    async execute(args, exec) {
      const located = await repository.rootOf(exec.agent, exec.signal)
      if ('error' in located) throw new Error(located.error)
      const briefing = await buildBriefing(args, repository, located.root, exec.signal)
      if (options.briefTodoSeed && exec.agent !== undefined) {
        try {
          exec.agent.session.append('todo/write', { todos: seedTodos(briefing, briefing.request) })
        } catch {
          // Todo seeding is a convenience; the briefing still stands without it.
        }
      }
      return { text: renderBriefing(briefing) }
    },
    presentCall: (args) => ({ card: 'generic', title: `Route: ${String(args?.request ?? '').slice(0, 80)}`, kind: 'read', rawInput: args }),
  })

  tools.push({
    name: 'libreuni_context',
    description:
      'Read one LibreUni rule pack or durable-context document in full. Without `topic`, returns the topic list. Use after `libreuni_brief` names the packs to read.',
    parameters: {
      topic: {
        type: 'string',
        description: 'Topic key from the briefing or the topic list (`standard`, `structure`, `components`, `decisions`, ...).',
        enum: [...Object.keys(TOPICS)],
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          text: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: value.text }],
    },
    async execute(args, exec) {
      const located = await repository.rootOf(exec.agent, exec.signal)
      if ('error' in located) throw new Error(located.error)
      const { root } = located
      const topic = args?.topic
      if (topic === undefined) {
        const lines = ['# LibreUni rule packs and context topics', '']
        for (const [key, entry] of Object.entries(TOPICS)) {
          if (entry.kind === 'file') lines.push(`- \`${key}\` — ${entry.summary} (${entry.path})`)
          else lines.push(`- \`${key}\` — ${entry.summary}`)
        }
        return { text: lines.join('\n') }
      }
      const entry = TOPICS[topic]
      if (entry === undefined) throw new Error(`Unknown topic \`${topic}\`. Call \`libreuni_context\` without a topic for the list.`)
      if (entry.kind === 'file') {
        const source = await repository.read(joinPath(root, entry.path), exec.signal)
        if (source === undefined) throw new Error(`${entry.path} does not exist in ${root}; report the missing rule pack instead of guessing its content.`)
        return { text: `<!-- ${entry.path} -->\n\n${source}` }
      }
      if (entry.kind === 'list') {
        const entries = await repository.list(joinPath(root, entry.dir), exec.signal)
        return { text: entries.map((item) => `${item.type === 'directory' ? `${item.name}/` : item.name}`).join('\n') }
      }
      const courses = await repository.courses(root, exec.signal)
      const lines = courses.map((course) => `${course.id}: ${course.lessons.length} lessons${course.unlisted.length > 0 ? `, ${course.unlisted.length} unlisted file(s)` : ''}`)
      return { text: lines.join('\n') }
    },
    presentCall: (args) => ({ card: 'generic', title: args?.topic === undefined ? 'List rule topics' : `Read rule pack: ${args.topic}`, kind: 'read', rawInput: args }),
  })

  tools.push({
    name: 'libreuni_check',
    description:
      'Run LibreUni validators and return an evidence record: exact command, exit status, output tail, and report paths. Prefer full layers for handoff; in-scope validators for iteration. Without `topic`, lists available checks and whether each npm script or script file exists.',
    parameters: {
      topic: {
        type: 'string',
        description: 'Check to run (see the list returned without it).',
        enum: [...Object.keys(CHECKS), ...Object.keys(ALIASES)],
      },
      args: {
        type: 'string',
        description: 'Optional extra arguments appended to the command, strictly validated per check (course ids, paths). Used by in-scope validators.',
      },
      timeout_ms: {
        type: 'integer',
        description: 'Optional timeout override in milliseconds, up to the check default x 2.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          text: { type: 'string', required: true },
          ok: { type: 'boolean', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: value.text }],
    },
    async execute(args, exec) {
      const located = await repository.rootOf(exec.agent, exec.signal)
      if ('error' in located) throw new Error(located.error)
      const { root } = located
      const packages = JSON.parse((await repository.read(joinPath(root, 'package.json'), exec.signal)) ?? '{}')
      const scripts = Object.keys(packages.scripts ?? {})
      const topic = args?.topic
      if (topic === undefined) {
        const lines = ['# LibreUni validators', '', 'Full layers (package.json):']
        for (const [key, check] of Object.entries(CHECKS)) {
          lines.push(`- \`${key}\` — \`${check.command}\`${scriptExists(check.command, scripts) ? '' : ' (script missing!)'}`)
          lines.push(`  ${check.covers}`)
        }
        lines.push('', 'In-scope validators (fast iteration):')
        for (const [key, check] of Object.entries(ALIASES)) {
          lines.push(`- \`${key}\` — \`${check.command}\``)
          lines.push(`  ${check.covers}`)
        }
        return { ok: true, text: lines.join('\n') }
      }
      const check = CHECKS[topic] ?? ALIASES[topic]
      if (check === undefined) throw new Error(`Unknown check \`${topic}\`. Call \`libreuni_check\` without a topic for the list.`)
      const extra = sanitizeArgs(args?.args)
      if (extra === undefined) throw new Error('`args` may contain only course ids, known script paths, and `--json <path>` values containing letters, digits, `.` `_` `-` `/`.')
      const command = extra.length === 0 ? check.command : `${check.command} ${extra}`
      const isNpm = check.command.startsWith('npm run ')
      if (isNpm && !scriptExists(check.command, scripts)) {
        throw new Error(`package.json has no script \`${check.command.slice(8)}\`; run \`libreuni_check\` without a topic to see what the repository provides.`)
      }
      if (!isNpm) {
        const script = check.command.split(' ').find((part) => /^[\w./-]+\.(mjs|js|py)$/.test(part))
        if (script !== undefined && (await repository.read(joinPath(root, script), exec.signal)) === undefined) {
          throw new Error(`${script} does not exist; the repository validator contract moved. Report it instead of substituting a weaker check.`)
        }
      }
      const defaultTimeout = check.timeoutMs
      const timeoutMs = clampTimeout(args?.timeout_ms, defaultTimeout)
      const result = await repository.run(command, timeoutMs, exec.signal)
      const ok = result.exitCode === 0 && !result.timedOut && !result.aborted
      return { ok, text: renderCheckResult(topic, check, result, ok, root) }
    },
    presentCall: (args) => ({ card: 'terminal', title: args?.topic === undefined ? 'List validators' : `Run ${args.topic}`, description: 'libreuni_check' }),
  })

  return tools
}

/**
 * @param {number} value
 * @param {number} fallback
 * @returns {number}
 */
function clampTimeout(value, fallback) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return fallback
  return Math.min(Math.max(Math.round(value), 5_000), fallback * 2)
}

/**
 * @param {string} command
 * @param {string[]} scripts
 * @returns {boolean}
 */
function scriptExists(command, scripts) {
  const match = /^npm run ([\w:-]+)$/.exec(command)
  return match === null ? true : scripts.includes(match[1])
}

/**
 * Accept only inert arguments: a single course id, known script paths, and `--json` targets.
 * @param {unknown} args
 * @returns {string | undefined} the shell-safe suffix, or undefined when rejected
 */
export function sanitizeArgs(args) {
  if (args === undefined || args === null) return ''
  const raw = String(args).trim()
  if (raw.length === 0) return ''
  const allowedTokens = new Set(['--strict', '--check-links', '--write-quality'].concat(Object.values(TOPICS).filter((entry) => entry.kind === 'file').map((entry) => entry.path)))
  const tokens = raw.split(/\s+/)
  const safeToken = /^[A-Za-z0-9._\/-]+$/
  const out = []
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (!safeToken.test(token)) return undefined
    if (token === '--json') {
      const next = tokens[index + 1]
      if (next === undefined || !/^[A-Za-z0-9._\/-]+$/.test(next)) return undefined
      out.push(token, next)
      index += 1
      continue
    }
    if (token.startsWith('-') && !allowedTokens.has(token)) return undefined
    out.push(token)
  }
  return out.join(' ')
}

/**
 * @param {string} topic
 * @param {{command: string, covers: string}} check
 * @param {Awaited<ReturnType<Repository['run']>>} result
 * @param {boolean} ok
 * @param {string} root
 * @returns {string}
 */
function renderCheckResult(topic, check, result, ok, root) {
  const lines = [`# libreuni_check ${topic}: ${ok ? 'PASS' : 'FAIL'}`, '']
  lines.push(`- Command: \`${result.command}\``)
  lines.push(`- Directory: \`${root}\``)
  lines.push(`- Exit: ${result.exitCode === null ? 'no exit status' : result.exitCode}${result.timedOut ? ' (timed out)' : ''}${result.aborted ? ' (aborted)' : ''} in ${(result.durationMs / 1000).toFixed(1)}s`)
  if (result.sandbox !== undefined && result.sandbox.denied === true) lines.push('- Sandbox: the confined process was denied filesystem access; rerun with approval or escalation rather than weakening the check.')
  lines.push(`- Contract: ${check.covers}`)
  const tailOf = (text) => tailLines(text, 60, 12_000)
  if (result.stdout.length > 0) {
    lines.push('', '## stdout (tail)', '```', tailOf(result.stdout), '```')
  }
  if (result.stderr.length > 0) {
    lines.push('', '## stderr (tail)', '```', tailOf(result.stderr), '```')
  }
  if (result.stdout.length === 0 && result.stderr.length === 0) lines.push('', 'No output captured.')
  if (result.truncated) lines.push('', 'Output was truncated by the capture budget; rerun through `bash` if the full log matters.')
  lines.push('', ok ? 'Report this layer as passed with its command.' : 'Report this layer as failed, quote the first actionable error, fix it, and rerun. Never claim the layer passed.')
  return lines.join('\n')
}

/**
 * @param {string} text
 * @param {number} maxLines
 * @param {number} maxChars
 * @returns {string}
 */
function tailLines(text, maxLines, maxChars) {
  const lines = text.replace(/\s+$/, '').split('\n')
  let tail = lines.slice(Math.max(0, lines.length - maxLines)).join('\n')
  if (tail.length > maxChars) tail = `…${tail.slice(tail.length - maxChars)}`
  return lines.length > maxLines ? `… (${lines.length - maxLines} earlier lines omitted)\n${tail}` : tail
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

/**
 * @param {any} ctx Cordis context
 */
export function apply(ctx) {
  // A module loaded before its fixed code can hot-reload itself after the profile reloads.
  ctx.on('app-boot/config-reload', () => {
    console.warn('libreuni-work: configuration reloaded; if a defect fixed in this plugin persists, restart the host so its module is reloaded.')
  })
  const repository = new Repository(ctx)
  ctx.systemPrompt.section({
    name: 'libreuni:routing',
    order: 2_750,
    text: routingSection(),
  })
  for (const definition of definitions(repository, { briefTodoSeed: true })) ctx.tools.register(definition)
}

export default apply
