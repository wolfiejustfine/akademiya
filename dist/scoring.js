(function (root) {
  'use strict';
  // The archived Kern Type rule is retained for provenance and regression tests.
  // Active grading is continuous and uses only movable letters.
  function penalty(distance) {
    const value = Math.abs(distance);
    if (value > 15) return value * 3;
    if (value > 10) return value * 1.5;
    if (value < 2) return 0;
    if (value < 3) return 1;
    if (value < 4) return 2;
    if (value < 6) return 3;
    if (value < 9) return 7;
    return 9;
  }
  function validate(positions, targets) {
    if (!Array.isArray(positions) || positions.length !== targets.length || !positions.length ||
        [...positions, ...targets].some(x => !Number.isFinite(x))) throw new TypeError('Некорректные координаты');
  }
  function legacyScore(positions, targets) {
    validate(positions,targets);
    const difference = positions.reduce((sum, position, i) => sum + penalty(targets[i] - position), 0);
    const n = positions.length;
    return difference > n ? Math.max(0, 5 * (20 - difference / n - 2)) : 100;
  }
  function score(positions, targets) {
    validate(positions,targets);
    const errors=positions.map((position,i)=>position-targets[i]);
    const movable=errors.length>2?errors.slice(1,-1):errors;
    // 1 percentage point per design unit of RMS displacement. The design cap
    // height is 160 units in every font, so grading is independent of the screen.
    const rms=Math.hypot(...movable)/Math.sqrt(movable.length);
    return Math.round(Math.max(0,100-rms)*1e6)/1e6;
  }
  function exactMatch(positions, targets) {
    // Only floating-point noise is ignored here. Scoring tolerance is a separate
    // concept: receiving the original maximum score does not prove coincidence.
    return Array.isArray(positions) && Array.isArray(targets) && positions.length > 0 &&
      positions.length === targets.length && positions.every((position, i) =>
        Number.isFinite(position) && Number.isFinite(targets[i]) && Math.abs(position - targets[i]) <= 1e-6);
  }
  function sessionScore(scores) {
    if (!scores.length) return 0;
    // Keep the established finale's truncation and rounding convention.
    return Math.ceil(scores.reduce((sum, value) => sum + Math.trunc(value), 0) / scores.length);
  }
  const api = Object.freeze({penalty, legacyScore, score, exactMatch, sessionScore});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KerningScore = api;
})(typeof window === 'undefined' ? globalThis : window);
