import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderFigure, sampleCurve, renderCaptionMath, detectSvgTextCollisions } from '../src/lib/plot/index.mjs';
import katex from 'katex';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const figuresDir = path.join(root, 'src/figures');
const lessonsDir = path.join(root, 'src/content/lessons');

function getFigureSpecs() {
  if (!fs.existsSync(figuresDir)) return [];
  const results = [];
  const courses = fs.readdirSync(figuresDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  for (const courseId of courses) {
    const courseDir = path.join(figuresDir, courseId);
    const files = fs.readdirSync(courseDir).filter((name) => name.endsWith('.mjs'));
    for (const file of files) {
      results.push({
        id: path.basename(file, '.mjs'),
        courseId,
        fullPath: path.join(courseDir, file),
      });
    }
  }
  return results;
}

function getAllFigureTagsInMdx() {
  const tags = [];
  if (!fs.existsSync(lessonsDir)) return tags;
  const courses = fs.readdirSync(lessonsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  for (const courseId of courses) {
    const courseDir = path.join(lessonsDir, courseId);
    const files = fs.readdirSync(courseDir).filter((f) => /\.mdx?$/.test(f));
    for (const file of files) {
      const content = fs.readFileSync(path.join(courseDir, file), 'utf8');
      const matches = content.matchAll(/<Figure\b[^>]*\bid=["']([^"']+)["']/g);
      for (const m of matches) {
        tags.push({
          id: m[1],
          courseId,
          lessonFile: path.join(courseId, file),
        });
      }
    }
  }
  return tags;
}

test('figures A1-A8, A10: figure specs pass automatic mathematical, visual, and collision checks', async () => {
  const figureSpecs = getFigureSpecs();
  if (figureSpecs.length === 0) return;

  for (const { id, courseId, fullPath } of figureSpecs) {
    const mod = await import(`file://${fullPath}`);
    const spec = mod.default || mod;

    // A1: Schema validation
    assert.ok(spec, `${id}: spec must be defined`);
    assert.equal(typeof spec.alt, 'string', `${id}: alt text must be string`);
    assert.ok(
      spec.alt.trim().length >= 40,
      `${id}: alt text must be at least 40 chars for accessibility (got ${spec.alt.length})`
    );
    assert.equal(typeof spec.caption, 'string', `${id}: caption must be string`);
    assert.ok(spec.caption.trim().length > 0, `${id}: caption must be non-empty`);

    // Verify caption LaTeX compiles without error and renders MathML
    const mathTokens = spec.caption.match(/\$\$[\s\S]+?\$\$|\$[^$\n]+\$/g) || [];
    for (const token of mathTokens) {
      const tex = token.startsWith('$$') ? token.slice(2, -2) : token.slice(1, -1);
      assert.doesNotThrow(
        () => katex.renderToString(tex.trim(), { throwOnError: true }),
        `${id}: caption math "${token}" failed KaTeX compilation`
      );
    }
    const renderedHtml = renderCaptionMath(spec.caption);
    assert.ok(typeof renderedHtml === 'string' && renderedHtml.length >= spec.caption.length, `${id}: renderCaptionMath output invalid`);

    const xDomain = spec.x || [-3, 3];

    // Helper to evaluate spec curves if panels exist
    const panelSpecs = Array.isArray(spec.panels) ? spec.panels : [spec];

    for (const panel of panelSpecs) {
      const pXDomain = panel.x || xDomain;

      // A2: Curve finiteness check (at least 95% finite points)
      for (const curve of panel.curves || []) {
        const segs = sampleCurve(curve.fn, curve.domain || pXDomain, {
          exclude: curve.exclude,
          samples: 200,
        });
        const totalSampled = segs.reduce((acc, s) => acc + s.length, 0);
        assert.ok(
          totalSampled >= 190,
          `${id} curve ${curve.id || 'unnamed'}: at least 95% finite samples required (got ${totalSampled}/200)`
        );

        // A3: Derivative check
        if (typeof curve.d === 'function') {
          const [minX, maxX] = curve.domain || pXDomain;
          const step = (maxX - minX) / 50;
          let diffCount = 0;
          for (let i = 1; i < 50; i++) {
            const x = minX + i * step;
            const analytic = curve.d(x);
            const numerical = (curve.fn(x + 1e-5) - curve.fn(x - 1e-5)) / 2e-5;
            if (Number.isFinite(analytic) && Number.isFinite(numerical)) {
              const diff = Math.abs(analytic - numerical) / (Math.abs(analytic) + 1);
              assert.ok(
                diff < 1e-3,
                `${id} curve ${curve.id}: derivative d(${x})=${analytic} does not agree with central difference ${numerical}`
              );
              diffCount++;
            }
          }
          assert.ok(diffCount > 30, `${id} curve ${curve.id}: checked derivative at ${diffCount} points`);
        }
      }

      // A8: Custom checks
      for (const [desc, checkFn] of panel.checks || []) {
        assert.equal(typeof checkFn, 'function', `${id}: check "${desc}" must be a function`);
        let pass = false;
        try {
          pass = Boolean(checkFn());
        } catch (err) {
          assert.fail(`${id}: custom check "${desc}" threw error: ${err.message}`);
        }
        assert.ok(pass, `${id}: custom check "${desc}" failed`);
      }
    }

    // A6: Axes check on rendered SVG
    const { svg } = renderFigure({ ...spec, id });
    assert.ok(svg.includes('<svg'), `${id}: rendered SVG must be valid`);

    if (xDomain[0] <= 0 && xDomain[1] >= 0) {
      assert.ok(
        svg.includes('lu-fig-axis-y'),
        `${id}: SVG must contain vertical axis line when 0 is in domain`
      );
    }

    // A7: Z-ordering check (fills before curves)
    const fillsPos = svg.indexOf('lu-fig-fills');
    const curvesPos = svg.indexOf('lu-fig-curves');
    if (fillsPos !== -1 && curvesPos !== -1) {
      assert.ok(
        fillsPos < curvesPos,
        `${id}: fills (area/riemann) must appear before curves in SVG z-order`
      );
    }

    // A10: No text overlap/collision check
    const collisions = detectSvgTextCollisions(svg);
    assert.deepEqual(
      collisions.map((c) => `"${c.a}" & "${c.b}"`),
      [],
      `${id}: overlapping text detected: ${collisions.map((c) => `"${c.a}" overlaps with "${c.b}"`).join(', ')}`
    );
  }
});

test('figures A9: MDX <Figure id> references resolve to existing specs and all specs are used', () => {
  const figureSpecs = getFigureSpecs();
  const mdxTags = getAllFigureTagsInMdx();

  const specMap = new Map(figureSpecs.map((f) => [`${f.courseId}/${f.id}`, f]));
  const usedSpecKeys = new Set();

  for (const tag of mdxTags) {
    const key = `${tag.courseId}/${tag.id}`;
    assert.ok(
      specMap.has(key),
      `Unresolved <Figure id="${tag.id}"> in ${tag.lessonFile}: no spec found at src/figures/${tag.courseId}/${tag.id}.mjs`
    );
    usedSpecKeys.add(key);
  }

  for (const [key, spec] of specMap.entries()) {
    assert.ok(
      usedSpecKeys.has(key),
      `Unused figure spec: src/figures/${spec.courseId}/${spec.id}.mjs is not referenced by any lesson`
    );
  }
});
