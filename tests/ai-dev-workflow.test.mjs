import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  addIssue,
  generatePreviewBundle,
  loadQueue,
  mapFileToRoutes,
  saveQueue,
  transitionIssue,
} from '../scripts/ai_dev_workflow.mjs';

test('issue lifecycle state machine enforces valid transitions and records clarification, approval, and verification', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lu-ai-dev-'));
  const queuePath = path.join(tmpDir, 'queue.json');

  const queue = loadQueue(queuePath);
  assert.deepEqual(queue.issues, []);

  const created = addIssue(queue, {
    id: 'TEST-01',
    title: 'Sample layout issue on calculus limits',
    route: '/lessons/calculus-intro/limits.html',
    description: 'Formula line gap is too tight',
    pilotScope: 'calculus-intro',
  });
  assert.equal(created.status, 'reported');
  assert.equal(created.expandBeyondPilotApproved, false);

  transitionIssue(queue, 'TEST-01', 'needs-clarification', (issue) => {
    issue.clarificationQuestions.push('Should single-line $$ become display math?');
  });
  assert.equal(queue.issues[0].status, 'needs-clarification');
  assert.equal(queue.issues[0].clarificationQuestions.length, 1);

  assert.throws(
    () => transitionIssue(queue, 'TEST-01', 'verified'),
    /Invalid state transition/,
    'Cannot jump directly from needs-clarification to verified',
  );

  transitionIssue(queue, 'TEST-01', 'approved', (issue) => {
    issue.resolution = 'Promote single-line $$ to display math';
  });
  assert.equal(queue.issues[0].status, 'approved');

  transitionIssue(queue, 'TEST-01', 'in-progress');
  assert.equal(queue.issues[0].status, 'in-progress');

  transitionIssue(queue, 'TEST-01', 'ready-for-review', (issue) => {
    issue.evidence = 'Verified in Playwright UX suite';
    issue.filesChanged = ['astro.config.mjs'];
  });
  assert.equal(queue.issues[0].status, 'ready-for-review');

  transitionIssue(queue, 'TEST-01', 'verified', (issue) => {
    issue.expandBeyondPilotApproved = true;
  });
  assert.equal(queue.issues[0].status, 'verified');
  assert.equal(queue.issues[0].expandBeyondPilotApproved, true);

  saveQueue(queue, queuePath);
  const reloaded = loadQueue(queuePath);
  assert.equal(reloaded.issues.length, 1);
  assert.equal(reloaded.issues[0].status, 'verified');

  const previewOut = path.join(tmpDir, 'preview');
  const bundle = generatePreviewBundle({ queuePath, outputDir: previewOut });
  assert.ok(fs.existsSync(bundle.mdPath));
  assert.ok(fs.existsSync(bundle.htmlPath));
  const mdText = fs.readFileSync(bundle.mdPath, 'utf8');
  assert.match(mdText, /TEST-01/);
  assert.match(mdText, /APPROVED/);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('mapFileToRoutes maps source files to their previewable HTML routes', () => {
  assert.deepEqual(mapFileToRoutes('src/pages/development.astro'), ['/development.html']);
  assert.deepEqual(mapFileToRoutes('src/content/lessons/calculus-intro/limits.mdx'), [
    '/lessons/calculus-intro/limits.html',
  ]);
  assert.deepEqual(mapFileToRoutes('src/content/careers/software-engineer.json'), [
    '/careers.html',
    '/careers/software-engineer.html',
  ]);
});
