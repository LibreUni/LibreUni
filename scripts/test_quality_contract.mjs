import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

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
const activeCourses = ['calculus-intro', 'computer-architecture', 'database-systems', 'operating-systems'];

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

test('active catalog, manifests, and lesson directories are exactly the survivor set', () => {
  const courseIds = fs.readdirSync(path.join(root, 'src/content/courses')).filter((name) => name.endsWith('.json')).map((name) => path.basename(name, '.json')).sort();
  const manifestIds = fs.readdirSync(path.join(root, 'src/data/course-manifests')).filter((name) => name.endsWith('.yml')).map((name) => path.basename(name, '.yml')).sort();
  const lessonIds = fs.readdirSync(path.join(root, 'src/content/lessons'), { withFileTypes: true }).filter((entry) => entry.isDirectory() && fs.readdirSync(path.join(root, 'src/content/lessons', entry.name)).some((name) => /\.mdx?$/.test(name))).map((entry) => entry.name).sort();
  assert.deepEqual(courseIds, [...activeCourses].sort());
  assert.deepEqual(manifestIds, [...activeCourses].sort());
  assert.deepEqual(lessonIds, [...activeCourses].sort());
});

test('course manifests are exact, ordered indexes rather than best-effort navigation hints', () => {
  const manifestDir = path.join(root, 'src/data/course-manifests');
  const lessonsRoot = path.join(root, 'src/content/lessons');

  for (const manifestName of fs.readdirSync(manifestDir).filter((name) => name.endsWith('.yml') && activeCourses.includes(path.basename(name, '.yml'))).sort()) {
    const courseId = path.basename(manifestName, '.yml');
    const manifest = parseYaml(read(`src/data/course-manifests/${manifestName}`));
    assert.ok(Array.isArray(manifest?.modules) && manifest.modules.length > 0, `${courseId} must declare non-empty modules`);

    const listed = [];
    for (const [moduleIndex, module] of manifest.modules.entries()) {
      assert.equal(typeof module?.title, 'string', `${courseId} module ${moduleIndex + 1} needs a title`);
      assert.ok(module.title.trim().length > 0, `${courseId} module ${moduleIndex + 1} title cannot be empty`);
      assert.ok(Array.isArray(module.lessons) && module.lessons.length > 0, `${courseId}/${module.title} needs lessons`);
      listed.push(...module.lessons);
    }

    assert.equal(new Set(listed).size, listed.length, `${courseId} manifest contains a duplicate lesson slug`);

    const lessonDir = path.join(lessonsRoot, courseId);
    const lessonFiles = fs.readdirSync(lessonDir).filter((name) => /\.mdx?$/.test(name)).sort();
    const actual = lessonFiles.map((name) => name.replace(/\.mdx?$/, '')).sort();
    assert.deepEqual([...listed].sort(), actual, `${courseId} manifest must list every lesson exactly once and may not name a missing lesson`);

    for (const lessonFile of lessonFiles) {
      const source = fs.readFileSync(path.join(lessonDir, lessonFile), 'utf8');
      const courseMatch = source.match(/^course:\s*["']?([^\n"']+)/m);
      assert.equal(courseMatch?.[1]?.trim(), courseId, `${courseId}/${lessonFile} frontmatter must use its containing course id`);
    }
  }
});

test('declared workload totals match every active course manifest', () => {
  const expectedHours = { 'calculus-intro': 28, 'computer-architecture': 187, 'operating-systems': 189.5, 'database-systems': 180 };
  for (const courseId of activeCourses) {
    const metadata = JSON.parse(read(`src/content/courses/${courseId}.json`));
    const manifest = parseYaml(read(`src/data/course-manifests/${courseId}.yml`));
    const listed = manifest.modules.flatMap((module) => module.lessons);
    const minutes = listed.map((slug) => Number(read(`src/content/lessons/${courseId}/${slug}.mdx`).match(/^estimatedMinutes:\s*([0-9]+(?:\.[0-9]+)?)\s*$/m)?.[1] ?? 0));
    assert.ok(minutes.every((value) => value > 0), `${courseId} lessons need positive workload estimates`);
    assert.equal(minutes.reduce((sum, value) => sum + value, 0) / 60, expectedHours[courseId], `${courseId} workload must match declared hours`);
    assert.equal(metadata.workloadHours, expectedHours[courseId]);
  }
});

test('the systems foundations path has only real active course steps and unique gates', () => {
  const pathFiles = fs.readdirSync(path.join(root, 'src/content/careers')).filter((name) => name.endsWith('.json')).sort();
  assert.deepEqual(pathFiles, ['systems-foundations.json']);
  const career = JSON.parse(read('src/content/careers/systems-foundations.json'));
  assert.deepEqual(career.steps.map((step) => step.id), ['machine', 'kernel', 'data']);
  assert.equal(career.steps.length, 3);
  const gateLessons = new Set();
  for (const step of career.steps) {
    assert.ok(step.id && step.title && step.outcome);
    assert.ok(Array.isArray(step.courses) && step.courses.length > 0);
    assert.ok(step.courses.every((course) => course.type === 'internal' && activeCourses.includes(course.id)));
    assert.ok(step.gate?.lesson && step.gate.prompt && Array.isArray(step.gate.criteria) && step.gate.criteria.length > 0);
    assert.ok(!gateLessons.has(step.gate.lesson), `gate lesson duplicated: ${step.gate.lesson}`);
    gateLessons.add(step.gate.lesson);
    assert.ok(fs.existsSync(path.join(root, 'src/content/lessons', `${step.gate.lesson}.mdx`)), `missing gate lesson: ${step.gate.lesson}`);
  }
  assert.ok(career.scope && Array.isArray(career.preparation) && career.preparation.length > 0 && Array.isArray(career.entryChecks) && career.entryChecks.length > 0 && career.synthesis);
});

test('Operating Systems labs and source traces share one pinned xv6 revision', () => {
  const revision = '7d7adbb1b0acbd67c9766a20d0f9900fef2789fa';
  const curriculum = read('docs/curriculum/OPERATING_SYSTEMS.md');
  assert.match(curriculum, new RegExp(revision));
  assert.match(curriculum, /clean-lab checkout/i);
  assert.match(curriculum, /cumulative integration branch/i);

  for (const slug of ['scheduler-lab', 'device-driver-lab', 'file-system-lab', 'operating-systems-capstone']) {
    const source = read(`src/content/lessons/operating-systems/${slug}.mdx`);
    assert.match(source, new RegExp(revision), `${slug} must identify the exact xv6 baseline`);
  }

  const lessonDir = path.join(root, 'src/content/lessons/operating-systems');
  const combined = fs.readdirSync(lessonDir)
    .filter((name) => /\.mdx?$/.test(name))
    .map((name) => fs.readFileSync(path.join(lessonDir, name), 'utf8'))
    .join('\n');
  assert.doesNotMatch(combined, /github\.com\/mit-pdos\/xv6-riscv\/(?:blob|tree)\/(?:riscv|master|main)(?:\/|\b)/, 'xv6 source links must not follow a moving branch');
});

test('Operating Systems uses concept-specific interactive models across every module', () => {
  const expectedModels = {
    'traps-interrupts-system-calls': 'SystemCallPathPlayground',
    'cpu-scheduling': 'SchedulerPlayground',
    'interleavings-and-atomicity': 'InterleavingPlayground',
    'condition-variables-and-semaphores': 'ConditionVariablePlayground',
    'page-tables-and-tlbs': 'PageTablePlayground',
    'replacement-working-sets-thrashing': 'PageReplacementPlayground',
    'device-io-interrupts-dma': 'DeviceIOPlayground',
    'storage-devices-and-io-scheduling': 'DiskSchedulingPlayground',
    'crash-consistency-and-journaling': 'CrashConsistencyPlayground',
    'containers-and-resource-control': 'IsolationBoundaryPlayground',
    'multicore-scalability-observability': 'LockScalabilityPlayground',
  };
  const manifest = parseYaml(read('src/data/course-manifests/operating-systems.yml'));
  const moduleByLesson = new Map(manifest.modules.flatMap((module, index) => module.lessons.map((slug) => [slug, index])));
  const coveredModules = new Set();

  for (const [slug, component] of Object.entries(expectedModels)) {
    const lesson = read(`src/content/lessons/operating-systems/${slug}.mdx`);
    const implementation = read(`src/components/playgrounds/${component}.tsx`);
    assert.match(lesson, new RegExp(`import ${component} `), `${slug} must import its named model`);
    assert.match(lesson, new RegExp(`<${component} client:load\\s*/>`), `${slug} must hydrate its named model`);
    assert.match(implementation, /<InteractivePlayground\b/, `${component} must use shared accessible and print-aware chrome`);
    assert.match(implementation, /onReset=/, `${component} must expose a deterministic reset`);
    coveredModules.add(moduleByLesson.get(slug));
  }

  assert.deepEqual([...coveredModules].sort(), [0, 1, 2, 3, 4, 5, 6], 'At least one causal model must appear in every Operating Systems module');
});
