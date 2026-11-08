import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadCourseStructure, loadAllCourseStructures, PAGE_KINDS, MODULE_KINDS } from '../src/lib/courseStructure.mjs';
import { getAllStatements, getStatementById } from '../src/utils/statementRegistry.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const activeCourses = ['calculus-intro', 'computer-architecture', 'database-systems', 'operating-systems'];

test('statement numbering matches snapshot exactly across all active courses', () => {
  const snapshotPath = path.join(root, 'tests/fixtures/statement-numbers.json');
  assert.ok(fs.existsSync(snapshotPath), 'Snapshot tests/fixtures/statement-numbers.json must exist');
  const expected = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

  for (const [id, expectedNumber] of Object.entries(expected)) {
    const item = getStatementById(id);
    assert.ok(item, `Statement id "${id}" from snapshot must exist in registry`);
    assert.equal(
      item.number,
      expectedNumber,
      `Statement "${id}" number changed! Expected ${expectedNumber}, got ${item.number}`
    );
  }
});

test('course structure validates module and page kinds and numbering rules', () => {
  for (const courseId of activeCourses) {
    const structure = loadCourseStructure(courseId, { root });
    assert.ok(structure.modules.length > 0, `${courseId} has modules`);

    let expectedChapter = 1;
    for (const mod of structure.modules) {
      assert.ok(MODULE_KINDS.includes(mod.kind), `Valid module kind "${mod.kind}" in ${courseId}`);
      if (mod.kind === 'chapter') {
        assert.equal(mod.index, expectedChapter, `Chapter module index in ${courseId} must be consecutive`);
        expectedChapter++;
      } else {
        assert.equal(mod.index, null, `Non-chapter module "${mod.title}" must have index null`);
      }

      let expectedSection = 1;
      for (const page of mod.pages) {
        assert.ok(PAGE_KINDS.includes(page.kind), `Valid page kind "${page.kind}" in ${courseId}/${page.slug}`);
        if (mod.kind === 'chapter') {
          assert.notEqual(page.kind, 'exam', `Chapter module ${mod.title} cannot contain exam page ${page.slug}`);
          assert.notEqual(page.kind, 'practice', `Chapter module ${mod.title} cannot contain practice page ${page.slug}`);
          if (page.kind === 'lesson' || page.kind === 'lab') {
            assert.equal(page.number, `${mod.index}.${expectedSection}`, `Section number matches expected sequence`);
            assert.equal(page.label, `${mod.index}.${expectedSection}`);
            expectedSection++;
          } else if (page.kind === 'problems') {
            assert.equal(page.label, `${mod.index}.P`);
          } else if (page.kind === 'recap') {
            assert.equal(page.label, `${mod.index}.R`);
          }
        } else if (mod.kind === 'practice') {
          assert.equal(page.kind, 'practice', `Practice module may only contain practice pages`);
        } else if (mod.kind === 'reference') {
          assert.equal(page.kind, 'recap', `Reference module may only contain recap pages`);
        }
      }
    }
  }
});

test('every manifest slug exists on disk and every disk lesson is in manifest', () => {
  for (const courseId of activeCourses) {
    const structure = loadCourseStructure(courseId, { root });
    const manifestSlugs = structure.pages.map((p) => p.slug);
    const lessonDir = path.join(root, 'src/content/lessons', courseId);
    const diskFiles = fs.readdirSync(lessonDir).filter((name) => /\.mdx?$/.test(name));
    const diskSlugs = diskFiles.map((name) => name.replace(/\.mdx?$/, '')).sort();

    assert.deepEqual(
      [...manifestSlugs].sort(),
      diskSlugs,
      `Manifest slugs in ${courseId} must match disk files exactly`
    );
  }
});

test('problem set, recap sheet, and exam contracts hold for specialized page kinds', () => {
  for (const courseId of activeCourses) {
    const structure = loadCourseStructure(courseId, { root });

    for (const mod of structure.modules) {
      const chapterLessonSlugs = new Set(
        mod.pages.filter((p) => p.kind === 'lesson' || p.kind === 'lab').map((p) => p.slug)
      );

      for (const page of mod.pages) {
        const fullPath = path.isAbsolute(page.file) ? page.file : path.join(root, page.file);
        if (!fs.existsSync(fullPath)) continue;
        const rawContent = fs.readFileSync(fullPath, 'utf8');

        // Banned MathStatement on non-lesson/non-lab pages (§2.4)
        if (page.kind !== 'lesson' && page.kind !== 'lab') {
          assert.doesNotMatch(
            rawContent,
            /<MathStatement\b/,
            `Page ${courseId}/${page.slug} of kind "${page.kind}" may not declare <MathStatement>`
          );
        }

        if (page.kind === 'problems') {
          assert.ok(Array.isArray(page.frontmatter.covers) && page.frontmatter.covers.length >= 1, `${page.slug} needs covers`);
          assert.ok(Array.isArray(page.frontmatter.outcomes) && page.frontmatter.outcomes.length >= 1, `${page.slug} needs outcomes`);
          for (const cov of page.frontmatter.covers) {
            assert.ok(chapterLessonSlugs.has(cov), `Problem set ${page.slug} cover "${cov}" must be in same chapter`);
          }
        }

        if (page.kind === 'recap') {
          assert.ok(Array.isArray(page.frontmatter.covers) && page.frontmatter.covers.length >= 1, `${page.slug} needs covers`);
          for (const cov of page.frontmatter.covers) {
            assert.ok(chapterLessonSlugs.has(cov), `Recap ${page.slug} cover "${cov}" must be in same chapter`);
          }

          // Recap sheet coverage check (§3.2):
          // every definition, theorem, lemma, proposition, corollary in covered pages
          // must be referenced via <Ref id="..."> or listed in omitStatements
          const omittedIds = new Set((page.frontmatter.omitStatements || []).map((o) => o.id));
          const refIds = new Set([...rawContent.matchAll(/<Ref\b[^>]*\bid=["']([^"']+)["']/g)].map((m) => m[1]));

          for (const covSlug of page.frontmatter.covers) {
            const covPath = path.join(root, 'src/content/lessons', courseId, `${covSlug}.mdx`);
            if (!fs.existsSync(covPath)) continue;
            const covContent = fs.readFileSync(covPath, 'utf8');
            const statementMatches = covContent.matchAll(/<MathStatement\b[^>]*\bid=["']([^"']+)["'][^>]*\bkind=["']([^"']+)["']/g);
            for (const stMatch of statementMatches) {
              const stId = stMatch[1];
              const stKind = stMatch[2].toLowerCase();
              if (['definition', 'theorem', 'lemma', 'proposition', 'corollary'].includes(stKind)) {
                assert.ok(
                  refIds.has(stId) || omittedIds.has(stId),
                  `Recap ${page.slug} must cover statement "${stId}" (${stKind}) from ${covSlug} or list it in omitStatements`
                );
              }
            }
          }
        }

        if (page.kind === 'practice') {
          assert.ok(Array.isArray(page.frontmatter.covers) && page.frontmatter.covers.length >= 1, `${page.slug} needs covers`);
        }
      }
    }
  }
});
