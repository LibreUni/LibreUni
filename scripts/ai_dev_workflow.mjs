#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_QUEUE_PATH = path.join(ROOT, 'docs/agent-context/ISSUE_QUEUE.json');
const DEFAULT_PREVIEW_DIR = path.join(ROOT, 'reports/ai-dev');

export const VALID_STATUSES = [
  'reported',
  'needs-clarification',
  'approved',
  'in-progress',
  'ready-for-review',
  'verified',
];

export const ALLOWED_TRANSITIONS = {
  reported: ['needs-clarification', 'approved', 'in-progress'],
  'needs-clarification': ['approved', 'reported'],
  approved: ['in-progress', 'needs-clarification'],
  'in-progress': ['ready-for-review', 'needs-clarification'],
  'ready-for-review': ['verified', 'in-progress', 'needs-clarification'],
  verified: ['in-progress'],
};

export function loadQueue(queuePath = DEFAULT_QUEUE_PATH) {
  if (!fs.existsSync(queuePath)) {
    return { version: 1, updatedAt: new Date().toISOString(), issues: [] };
  }
  return JSON.parse(fs.readFileSync(queuePath, 'utf8'));
}

export function saveQueue(queue, queuePath = DEFAULT_QUEUE_PATH) {
  fs.mkdirSync(path.dirname(queuePath), { recursive: true });
  queue.updatedAt = new Date().toISOString();
  fs.writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`, 'utf8');
  return queue;
}

export function transitionIssue(queue, id, nextStatus, mutateFn) {
  const issue = queue.issues.find((item) => item.id === id);
  if (!issue) {
    throw new Error(`Issue '${id}' not found in queue.`);
  }
  if (!VALID_STATUSES.includes(nextStatus)) {
    throw new Error(`Invalid status '${nextStatus}'. Expected one of: ${VALID_STATUSES.join(', ')}`);
  }
  const allowed = ALLOWED_TRANSITIONS[issue.status] || [];
  if (issue.status !== nextStatus && !allowed.includes(nextStatus)) {
    throw new Error(
      `Invalid state transition for '${id}': cannot move from '${issue.status}' to '${nextStatus}'. Allowed: ${allowed.join(', ')}`,
    );
  }
  issue.status = nextStatus;
  issue.updatedAt = new Date().toISOString();
  if (mutateFn) {
    mutateFn(issue);
  }
  return issue;
}

export function addIssue(queue, { id, title, route = '/', description = '', pilotScope = '' }) {
  if (!id || !title) {
    throw new Error('Both --id and --title are required to add an issue.');
  }
  if (queue.issues.some((item) => item.id === id)) {
    throw new Error(`Issue '${id}' already exists.`);
  }
  const now = new Date().toISOString();
  const issue = {
    id,
    title,
    route,
    description,
    status: 'reported',
    pilotScope: pilotScope || null,
    expandBeyondPilotApproved: false,
    clarificationQuestions: [],
    resolution: null,
    filesChanged: [],
    evidence: null,
    comments: [],
    createdAt: now,
    updatedAt: now,
  };
  queue.issues.push(issue);
  return issue;
}

export function mapFileToRoutes(relFile) {
  const normalized = relFile.replace(/\\/g, '/');
  if (normalized === 'src/pages/index.astro') return ['/index.html'];
  if (normalized === 'src/pages/development.astro') return ['/development.html'];
  if (normalized === 'src/pages/about.astro') return ['/about.html'];
  if (normalized.startsWith('src/pages/careers/') || normalized.startsWith('src/content/careers/')) {
    return ['/careers.html', '/careers/software-engineer.html'];
  }
  if (normalized.startsWith('src/content/lessons/')) {
    const slug = normalized.replace(/^src\/content\/lessons\//, '').replace(/\.mdx?$/, '');
    return [`/lessons/${slug}.html`];
  }
  if (normalized.startsWith('src/content/courses/')) {
    const courseId = normalized.replace(/^src\/content\/courses\//, '').replace(/\.json$/, '');
    return [`/courses/${courseId}.html`];
  }
  if (normalized.includes('CodeRunner') || normalized.includes('SyntaxHighlighter')) {
    return ['/lessons/calculus-intro/limits-laboratory.html'];
  }
  if (normalized.includes('StudyToolsRail') || normalized === 'src/pages/lessons/[...slug].astro') {
    return ['/lessons/calculus-intro/limits.html', '/lessons/database-systems/relational-model.html'];
  }
  if (normalized.includes('Layout.astro') || normalized.includes('global.css') || normalized.includes('themes.ts')) {
    return ['/index.html', '/lessons/calculus-intro/limits.html', '/careers/software-engineer.html'];
  }
  return [];
}

export function collectWorkspaceChanges(repoRoot = ROOT) {
  let statusOutput = '';
  let diffStatOutput = '';
  try {
    statusOutput = execFileSync('git', ['status', '--porcelain'], { cwd: repoRoot, encoding: 'utf8' });
    diffStatOutput = execFileSync('git', ['diff', '--stat'], { cwd: repoRoot, encoding: 'utf8' });
  } catch {
    // Fallback if git is unavailable
  }

  const changedFiles = [];
  const affectedRoutes = new Set();

  for (const rawLine of statusOutput.split('\n')) {
    const line = rawLine.trimEnd();
    if (!line) continue;
    const status = line.slice(0, 2).trim() || 'M';
    const filePath = line.slice(3).trim();
    changedFiles.push({ status, path: filePath });
    for (const route of mapFileToRoutes(filePath)) {
      affectedRoutes.add(route);
    }
  }

  return {
    changedFiles,
    affectedRoutes: [...affectedRoutes].sort(),
    diffStat: diffStatOutput.trim(),
  };
}

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function generatePreviewBundle({
  queuePath = DEFAULT_QUEUE_PATH,
  outputDir = DEFAULT_PREVIEW_DIR,
  repoRoot = ROOT,
} = {}) {
  const queue = loadQueue(queuePath);
  const changes = collectWorkspaceChanges(repoRoot);
  fs.mkdirSync(outputDir, { recursive: true });

  const statusCounts = Object.fromEntries(VALID_STATUSES.map((s) => [s, 0]));
  for (const issue of queue.issues) {
    statusCounts[issue.status] = (statusCounts[issue.status] || 0) + 1;
  }

  const pilotIssues = queue.issues.filter((issue) => issue.pilotScope);

  const mdLines = [
    '# Rapid AI Dev — Change Preview & Issue Review Bundle',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## 1. Issue Queue Summary',
    '',
    '| Status | Count |',
    '| --- | ---: |',
    ...VALID_STATUSES.map((status) => `| \`${status}\` | ${statusCounts[status] || 0} |`),
    '',
    '## 2. Active & Reviewed Issues',
    '',
    '| ID | Title | Route | Status | Pilot Gate | Evidence / Resolution |',
    '| --- | --- | --- | --- | --- | --- |',
    ...queue.issues.map((issue) => {
      const pilotBadge = issue.pilotScope
        ? `${issue.pilotScope} (${issue.expandBeyondPilotApproved ? 'Approved to expand' : 'Pilot only'})`
        : '—';
      const detail = issue.evidence || issue.resolution || issue.clarificationQuestions.at(-1) || issue.description || '—';
      return `| \`${issue.id}\` | ${issue.title} | \`${issue.route}\` | \`${issue.status}\` | ${pilotBadge} | ${detail.replace(/\|/g, '\\|')} |`;
    }),
    '',
    '## 3. Workspace Changed Files & Affected Preview Routes',
    '',
    `- **Changed files (${changes.changedFiles.length}):**`,
    ...changes.changedFiles.map((f) => `  - \`[${f.status}] ${f.path}\``),
    '',
    `- **Affected routes to preview / capture (${changes.affectedRoutes.length}):**`,
    ...changes.affectedRoutes.map((r) => `  - \`${r}\``),
    '',
  ];

  if (pilotIssues.length > 0) {
    mdLines.push('## 4. Pilot Expansion Gates', '');
    for (const issue of pilotIssues) {
      mdLines.push(
        `- **\`${issue.id}\` (${issue.title})** — Scope: \`${issue.pilotScope}\` · Status: \`${issue.status}\` · Expand beyond pilot: **${issue.expandBeyondPilotApproved ? 'APPROVED' : 'LOCKED (awaiting review approval)'}**`,
      );
    }
    mdLines.push('');
  }

  const mdContent = `${mdLines.join('\n')}\n`;
  const mdPath = path.join(outputDir, 'preview-summary.md');
  fs.writeFileSync(mdPath, mdContent, 'utf8');

  const htmlContent = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LibreUni Rapid AI Dev — Preview &amp; Review Queue</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, -apple-system, sans-serif; }
    body { max-width: 1120px; margin: 0 auto; padding: 2rem 1.25rem; line-height: 1.6; }
    h1, h2, h3 { letter-spacing: -0.02em; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0 2rem; font-size: 0.9rem; }
    th, td { border: 1px solid #cbd5e1; padding: 0.65rem 0.85rem; text-align: left; vertical-align: top; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.85em; padding: 0.15rem 0.35rem; border-radius: 4px; background: rgba(148, 163, 184, 0.2); }
    .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 1rem 1.25rem; }
  </style>
</head>
<body>
  <h1>LibreUni Rapid AI Dev — Preview &amp; Review Queue</h1>
  <p>Generated: <code>${escapeHtml(new Date().toISOString())}</code></p>

  <div class="grid">
    <div class="card">
      <strong>Changed Workspace Files</strong>
      <p style="font-size:1.75rem;font-weight:800;margin:0.25rem 0;">${changes.changedFiles.length}</p>
    </div>
    <div class="card">
      <strong>Affected Preview Routes</strong>
      <p style="font-size:1.75rem;font-weight:800;margin:0.25rem 0;">${changes.affectedRoutes.length}</p>
    </div>
    <div class="card">
      <strong>Tracked Review Issues</strong>
      <p style="font-size:1.75rem;font-weight:800;margin:0.25rem 0;">${queue.issues.length}</p>
    </div>
    <div class="card">
      <strong>Verified / Ready Issues</strong>
      <p style="font-size:1.75rem;font-weight:800;margin:0.25rem 0;">${(statusCounts.verified || 0) + (statusCounts['ready-for-review'] || 0)}</p>
    </div>
  </div>

  <h2>Issue Lifecycle Queue</h2>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Issue</th>
        <th>Route</th>
        <th>Status</th>
        <th>Resolution &amp; Verification Evidence</th>
        <th>Comments</th>
      </tr>
    </thead>
    <tbody>
      ${queue.issues
        .map(
          (issue) => `<tr>
        <td><code>${escapeHtml(issue.id)}</code></td>
        <td><strong>${escapeHtml(issue.title)}</strong><br/><small>${escapeHtml(issue.description)}</small></td>
        <td><code>${escapeHtml(issue.route)}</code></td>
        <td><span class="badge">${escapeHtml(issue.status)}</span></td>
        <td>${escapeHtml(issue.evidence || issue.resolution || issue.clarificationQuestions.join('; ') || '—')}</td>
        <td>${
          issue.comments?.length
            ? issue.comments.map((c) => `<div><strong>${escapeHtml(c.author)}:</strong> ${escapeHtml(c.note)}</div>`).join('')
            : '—'
        }</td>
      </tr>`,
        )
        .join('\n')}
    </tbody>
  </table>

  <h2>Affected Preview Routes</h2>
  <ul>
    ${changes.affectedRoutes.map((route) => `<li><a href="http://127.0.0.1:4321${escapeHtml(route)}"><code>${escapeHtml(route)}</code></a></li>`).join('\n')}
  </ul>

  <h2>Changed Workspace Files</h2>
  <ul>
    ${changes.changedFiles.map((f) => `<li><code>[${escapeHtml(f.status)}] ${escapeHtml(f.path)}</code></li>`).join('\n')}
  </ul>
</body>
</html>`;

  const htmlPath = path.join(outputDir, 'preview-summary.html');
  fs.writeFileSync(htmlPath, htmlContent, 'utf8');

  return { mdPath, htmlPath, changes, statusCounts };
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i += 1;
      }
    } else {
      positional.push(token);
    }
  }
  return { positional, flags };
}

function runCli() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [command = 'list', subcommand] = positional;
  const queuePath = flags.queue ? path.resolve(flags.queue) : DEFAULT_QUEUE_PATH;

  if (command === 'preview') {
    const outputDir = flags.output ? path.resolve(flags.output) : DEFAULT_PREVIEW_DIR;
    const result = generatePreviewBundle({ queuePath, outputDir });
    console.log(`Generated preview bundle:\n  Markdown: ${result.mdPath}\n  HTML:     ${result.htmlPath}`);
    return;
  }

  const queue = loadQueue(queuePath);

  if (command === 'list') {
    const filtered = queue.issues.filter((issue) => {
      if (flags.status && issue.status !== flags.status) return false;
      if (flags.route && issue.route !== flags.route) return false;
      return true;
    });
    for (const issue of filtered) {
      console.log(`[${issue.status.padEnd(19)}] ${issue.id.padEnd(24)} (${issue.route}) — ${issue.title}`);
    }
    return;
  }

  if (command === 'add') {
    const issue = addIssue(queue, {
      id: flags.id,
      title: flags.title,
      route: flags.route || '/',
      description: flags.description || '',
      pilotScope: flags.pilot || '',
    });
    saveQueue(queue, queuePath);
    console.log(`Added issue '${issue.id}' in status '${issue.status}'.`);
    return;
  }

  if (command === 'clarify') {
    if (!flags.id || !flags.question) {
      throw new Error('Usage: clarify --id <id> --question "<question>"');
    }
    const issue = transitionIssue(queue, flags.id, 'needs-clarification', (item) => {
      item.clarificationQuestions.push(flags.question);
    });
    saveQueue(queue, queuePath);
    console.log(`Issue '${issue.id}' moved to '${issue.status}'.`);
    return;
  }

  if (command === 'approve') {
    if (!flags.id || !flags.resolution) {
      throw new Error('Usage: approve --id <id> --resolution "<decision>" [--expand-beyond-pilot]');
    }
    const issue = transitionIssue(queue, flags.id, 'approved', (item) => {
      item.resolution = flags.resolution;
      if (flags['expand-beyond-pilot']) {
        item.expandBeyondPilotApproved = true;
      }
    });
    saveQueue(queue, queuePath);
    console.log(`Issue '${issue.id}' approved.`);
    return;
  }

  if (command === 'start') {
    if (!flags.id) throw new Error('Usage: start --id <id>');
    const issue = transitionIssue(queue, flags.id, 'in-progress');
    saveQueue(queue, queuePath);
    console.log(`Issue '${issue.id}' moved to '${issue.status}'.`);
    return;
  }

  if (command === 'ready') {
    if (!flags.id || !flags.evidence) {
      throw new Error('Usage: ready --id <id> --evidence "<verification summary>" [--files "a.ts,b.astro"]');
    }
    const issue = transitionIssue(queue, flags.id, 'ready-for-review', (item) => {
      item.evidence = flags.evidence;
      if (flags.files) {
        item.filesChanged = String(flags.files)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    });
    saveQueue(queue, queuePath);
    console.log(`Issue '${issue.id}' marked '${issue.status}'.`);
    return;
  }

  if (command === 'comment') {
    if (!flags.id || !flags.note) {
      throw new Error('Usage: comment --id <id> --note "<comment>" [--author "<name>"]');
    }
    const issue = queue.issues.find((item) => item.id === flags.id);
    if (!issue) throw new Error(`Issue '${flags.id}' not found.`);
    issue.comments.push({
      author: flags.author || 'reviewer',
      note: flags.note,
      createdAt: new Date().toISOString(),
    });
    saveQueue(queue, queuePath);
    console.log(`Added comment to '${issue.id}'.`);
    return;
  }

  if (command === 'verify') {
    if (!flags.id) throw new Error('Usage: verify --id <id> [--expand-beyond-pilot]');
    const issue = transitionIssue(queue, flags.id, 'verified', (item) => {
      if (flags['expand-beyond-pilot']) {
        item.expandBeyondPilotApproved = true;
      }
    });
    saveQueue(queue, queuePath);
    console.log(`Issue '${issue.id}' verified.`);
    return;
  }

  throw new Error(`Unknown command '${command}${subcommand ? ` ${subcommand}` : ''}'.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli();
}
