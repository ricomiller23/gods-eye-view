import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findWorldCity, levenshteinDistance } from './data/worldCities.js';

test('levenshteinDistance computes accurate edit distance for typos', () => {
  assert.equal(levenshteinDistance('mosow', 'moscow'), 1);
  assert.equal(levenshteinDistance('scotsdale', 'scottsdale'), 1);
  assert.equal(levenshteinDistance('berlin', 'berlin'), 0);
});

test('findWorldCity matches city typos and exact names', () => {
  const moscowHit = findWorldCity('Mosow');
  assert.ok(moscowHit, 'Mosow typo should match Moscow');
  assert.equal(moscowHit.name, 'Moscow');

  const scottsdaleHit = findWorldCity('Scottsdale');
  assert.ok(scottsdaleHit, 'Scottsdale should match Scottsdale');
  assert.equal(scottsdaleHit.name, 'Scottsdale');

  const scotsdaleHit = findWorldCity('scotsdale');
  assert.ok(scotsdaleHit, 'scotsdale typo should match Scottsdale');
  assert.equal(scotsdaleHit.name, 'Scottsdale');
});
