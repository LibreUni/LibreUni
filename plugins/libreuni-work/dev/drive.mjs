// Development-only driver: run the plugin against a real Cordis context and a local fs/shell stand-in,
// so tool logic is exercised end to end without the Host. Run: node plugins/libreuni-work/dev/drive.mjs
import fs from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { pathToFileURL } from 'node:url'

async function loadCordisContext() {
  if (process.env.DSH_CORDIS_PATH) {
    return (await import(pathToFileURL(process.env.DSH_CORDIS_PATH).href)).Context
  }
  try {
    return (await import('cordis')).Context
  } catch {
    throw new Error('Could not resolve cordis. Install `cordis` or set DSH_CORDIS_PATH to its entry module.')
  }
}

const Context = await loadCordisContext()

const cwd = process.cwd()
const ctx = new Context()
const registered = []
ctx.provide('tools'); ctx.set('tools', { register: (d) => registered.push(d) })
ctx.provide('systemPrompt'); ctx.set('systemPrompt', { section: () => {} })
ctx.provide('shell'); ctx.set('shell', {
  resolve: (r) => ({ workdir: cwd, onExpiry: 'kill', timeoutMs: 120000, ...r }),
  execute: async (spec) => {
    const run = await new Promise((res) => execFile('bash', ['-lc', spec.command], { cwd: spec.workdir, maxBuffer: 8e6 }, (e, out, err) => res({ out, err, code: e?.code ?? (e ? 1 : 0) })))
    return { result: async () => ({ exitCode: run.code, timedOut: false, aborted: false, timeoutMs: spec.timeoutMs, stdout: { text: run.out, truncated: false }, stderr: { text: run.err, truncated: false } }) }
  },
})
const abs = (p) => (p.startsWith('/') ? p : `${cwd}/${p}`)
ctx.provide('fs'); ctx.set('fs', {
  resolve: async (p) => ({ targetKey: p, displayPath: p }),
  readText: async (t) => fs.readFile(abs(t.displayPath), 'utf8'),
  listDir: async (t) => (await fs.readdir(abs(t.displayPath), { withFileTypes: true })).map((d) => ({ name: d.name, type: d.isDirectory() ? 'directory' : 'file', target: { targetKey: d.name, displayPath: d.name } })),
  stat: async (t) => { try { await fs.stat(abs(t.displayPath)); return { type: 'file' } } catch { return undefined } },
})
ctx.provide('workingDirectory'); ctx.set('workingDirectory', { get: () => cwd, defaultDirectory: cwd })

const plugin = await import('../index.js')
plugin.apply(ctx)
const tool = (name) => registered.find((t) => t.name === name)
const appended = []
const agent = { session: { append: (type, data) => appended.push({ type, data }) } }
const exec = { agent, signal: new AbortController().signal }

const brief = await tool('libreuni_brief').execute({ request: 'improve the CPU scheduling lesson exercises', path: 'src/content/lessons/operating-systems/cpu-scheduling.mdx', course: 'operating-systems' }, exec)
console.log(brief.text)
console.log('\n=== TODO SEEDED ===\n' + JSON.stringify(appended[0]?.data.todos, null, 1))
const check = await tool('libreuni_check').execute({ topic: 'course-integrity', args: 'operating-systems' }, exec)
console.log('\n=== CHECK ===\n' + check.text.slice(0, 900))
const list = await tool('libreuni_context').execute({}, exec)
console.log('\n=== TOPICS ===\n' + list.text.split('\n').slice(0, 6).join('\n'))

console.log('\n=== FAIL PATH ===\n' + (await tool('libreuni_check').execute({ topic: 'verify-lessons', args: 'no-such-course' }, exec)).text.slice(0, 700))
console.log('\n=== REJECTED ARGS ===')
try { await tool('libreuni_check').execute({ topic: 'course-integrity', args: 'x; touch /tmp/pwned' }, exec) } catch (error) { console.log('rejected:', error.message) }
console.log('\n=== MISSING SCRIPT ===')
try { await tool('libreuni_check').execute({ topic: 'content', args: '' }, exec) } catch (error) { console.log('error:', error.message) }
