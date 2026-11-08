import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStatementRegistry,
  getStatementById,
  getAllStatements,
  getCourseStatements,
  clearRegistryCache,
} from '../src/utils/statementRegistry.mjs';

test('statement registry indexes statements across manifests and lessons', () => {
  clearRegistryCache();
  const all = getAllStatements();
  assert.ok(all.length >= 27, `Expected at least 27 indexed statements, got ${all.length}`);

  const limitDef = getStatementById('limit-definition');
  assert.ok(limitDef, 'Expected limit-definition to exist in registry');
  assert.equal(limitDef.id, 'limit-definition');
  assert.equal(limitDef.courseId, 'calculus-intro');
  assert.equal(limitDef.lessonSlug, 'limits');
  assert.equal(limitDef.moduleIndex, 1);
  assert.equal(limitDef.lessonIndex, 1);
  assert.equal(limitDef.itemIndex, 1);
  assert.equal(limitDef.number, '1.1.1');
  assert.equal(limitDef.kind, 'definition');
  assert.equal(limitDef.kindLabel, 'Definition');
  assert.equal(limitDef.title, 'Limit of a Function');
  assert.ok(limitDef.preview.length > 20, 'Expected non-empty preview');
});

test('statement registry assigns correct module.lesson.item numbers', () => {
  clearRegistryCache();
  const derivDef = getStatementById('derivative-definition');
  assert.ok(derivDef, 'Expected derivative-definition to exist');
  assert.equal(derivDef.number, '1.2.1');

  const rolles = getStatementById('rolles-theorem');
  assert.ok(rolles, 'Expected rolles-theorem to exist');
  assert.equal(rolles.number, '1.3.1');

  const mvt = getStatementById('mean-value-theorem');
  assert.ok(mvt, 'Expected mean-value-theorem to exist');
  assert.equal(mvt.number, '1.3.2');
});

test('statement registry returns undefined for nonexistent statement id', () => {
  clearRegistryCache();
  const nonexistent = getStatementById('definitely-not-an-existing-id');
  assert.equal(nonexistent, undefined);
});

test('getCourseStatements filters statements by course', () => {
  clearRegistryCache();
  const calcStatements = getCourseStatements('calculus-intro');
  assert.ok(calcStatements.length >= 27, 'Calculus should have at least 27 statements');
  assert.ok(calcStatements.every((st) => st.courseId === 'calculus-intro'));
});
