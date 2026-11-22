#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { auditExtendedMdxContent, auditSiteStructureConsistency } from './lib/content_audit_rules.mjs';
import { lintAllUiFiles } from './lib/ui_lint_rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function walkMdx(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkMdx(full));
    else if (entry.name.endsWith('.mdx')) files.push(full);
  }
  return files.sort();
}

function splitFrontmatter(raw) {
  const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: raw };
  return { frontmatter: YAML.parse(match[1]) || {}, body: match[2] };
}

function runExtendedAudit() {
  const lessons = walkMdx(path.join(ROOT, 'src/content/lessons'));
  const errors = [];

  for (const file of lessons) {
    const relPath = path.relative(ROOT, file).replaceAll('\\', '/');
    const { frontmatter, body } = splitFrontmatter(fs.readFileSync(file, 'utf8'));
    errors.push(...auditExtendedMdxContent({ relPath, body, frontmatter }));
  }

  errors.push(...auditSiteStructureConsistency(ROOT));
  const uiResult = lintAllUiFiles(ROOT);
  errors.push(...uiResult.errors);

  console.log(
    `Extended audit checked ${lessons.length} MDX lesson(s) and ${uiResult.fileCount} UI source file(s): ${errors.length} error(s).`
  );
  if (errors.length > 0) {
    for (const err of errors) {
      console.error(`  ❌ ${err}`);
    }
    process.exit(1);
  }
  console.log('PASSED: Extended MDX content, UI contrast/safety, and playground contract audit');
}

runExtendedAudit();
