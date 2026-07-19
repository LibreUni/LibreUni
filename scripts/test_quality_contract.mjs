import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const qualityCommands = [
  'check:content',
  'check:build',
  'check:e2e',
  'check:ux',
  'check:visual',
  'check:lighthouse',
  'check:required',
  'check:full',
];

test('agent router exposes the shared operating contract', () => {
  const router = read('AGENTS.md');

  for (const relativePath of [
    'docs/agent-rules/BASELINE.md',
    'docs/agent-rules/TASKS.md',
    'docs/agent-rules/ROLES.md',
    'docs/agent-rules/SKILLS.md',
    'docs/agent-rules/VALIDATION.md',
    'docs/agent-context/README.md',
  ]) {
    assert.ok(fs.existsSync(path.join(root, relativePath)), `${relativePath} should exist`);
  }

  assert.match(router, /BASELINE\.md/);
  assert.match(router, /TASKS\.md/);
  assert.match(router, /VALIDATION\.md/);
});

test('package quality layers remain named and composable', () => {
  const { scripts } = JSON.parse(read('package.json'));

  for (const command of qualityCommands) {
    assert.equal(typeof scripts[command], 'string', `${command} should be defined`);
  }

  assert.equal(scripts.test, 'npm run check:full');
  assert.match(scripts['check:required'], /check:content/);
  assert.match(scripts['check:required'], /check:build/);
  assert.match(scripts['check:required'], /check:e2e/);
  assert.match(scripts['check:required'], /check:ux/);
  assert.match(scripts['check:full'], /check:required/);
  assert.match(scripts['check:full'], /check:lighthouse/);
});

test('CI invokes the required named layers and scopes Lighthouse to main pushes', () => {
  const workflow = read('.github/workflows/quality.yml');

  for (const command of ['check:content', 'check:build', 'check:e2e', 'check:ux', 'check:lighthouse']) {
    assert.match(workflow, new RegExp(`npm run ${command}`));
  }

  assert.match(workflow, /github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
});
