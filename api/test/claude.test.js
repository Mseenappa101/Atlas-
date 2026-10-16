import { test } from 'node:test';
import assert from 'node:assert/strict';
import { costUsd } from '../claude.js';

test('costUsd uses $2/M input and $10/M output', () => {
  assert.equal(costUsd(1_000_000, 0), 2);
  assert.equal(costUsd(0, 1_000_000), 10);
  assert.equal(costUsd(3000, 1500), 0.021);
});
