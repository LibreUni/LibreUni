import test from 'node:test';
import assert from 'node:assert/strict';
import { findPlantUmlDiagnostics } from './plantuml-diagnostics.mjs';

test('detects PlantUML warnings embedded in an otherwise valid SVG', () => {
  const svg = '<svg><text>You&#160;should&#160;use&#160;a&#160;bracket&#160;({)&#160;when&#160;defining&#160;your&#160;container&#160;\'partition\'&#160;L&#160;=&#160;A[0:mid]</text></svg>';
  assert.equal(findPlantUmlDiagnostics(svg).length, 1);
});

test('does not reject a clean SVG', () => {
  assert.deepEqual(findPlantUmlDiagnostics('<svg><text>Sorted output</text></svg>'), []);
});
