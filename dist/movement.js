(function (root) {
  'use strict';
  function bounds(level, index) {
    const glyph = level.glyphs[index];
    if (!glyph) throw new RangeError('Буква не найдена');
    if (index === 0 || index === level.glyphs.length - 1) return [glyph.start, glyph.start];
    // Travel is limited only by the visible board, never by the initial position
    // or by a neighbouring glyph. This permits real optical kerning and overlap.
    return [8 - glyph.bounds[0], level.width - 8 - glyph.bounds[2]];
  }
  function clamp(level, index, value) {
    if (!Number.isFinite(value)) throw new TypeError('Некорректная координата');
    const [min, max] = bounds(level, index);
    return Math.max(min, Math.min(max, value));
  }
  function valid(values, level) {
    if (!Array.isArray(values) || values.length !== level.glyphs.length) return false;
    return values.every((value, index) => {
      if (!Number.isFinite(value)) return false;
      const [min, max] = bounds(level, index);
      return value >= min - .001 && value <= max + .001 &&
        (index !== 0 && index !== values.length - 1 || value === level.glyphs[index].start);
    });
  }
  const api = Object.freeze({bounds, clamp, valid});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KerningMovement = api;
})(typeof window === 'undefined' ? globalThis : window);
