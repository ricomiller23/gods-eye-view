import test from 'node:test';
import assert from 'node:assert/strict';
import { isMobileDevice } from './device.js';

test('isMobileDevice returns false in SSR / non-browser environments', () => {
  assert.equal(isMobileDevice({ win: null, nav: null }), false);
});

test('isMobileDevice detects iPhone', () => {
  const win = { matchMedia: () => ({ matches: false }) };
  const nav = {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    maxTouchPoints: 5,
  };
  assert.equal(isMobileDevice({ win, nav }), true);
});

test('isMobileDevice detects iPad via desktop Safari UA with touch points', () => {
  const win = { matchMedia: () => ({ matches: true }) };
  const nav = {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    maxTouchPoints: 5,
  };
  assert.equal(isMobileDevice({ win, nav }), true);
});

test('isMobileDevice detects Android mobile', () => {
  const win = { matchMedia: () => ({ matches: false }) };
  const nav = {
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
    maxTouchPoints: 5,
  };
  assert.equal(isMobileDevice({ win, nav }), true);
});

test('isMobileDevice returns false on desktop Mac / Windows without touch or mobile UA', () => {
  const win = { matchMedia: () => ({ matches: false }) };
  const nav = {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    maxTouchPoints: 0,
  };
  assert.equal(isMobileDevice({ win, nav }), false);
});
