/**
 * Per-employee identity colors — deliberately distinct from the semantic
 * status palette (sage=success, amber=warning, rouge=error) so a colored
 * avatar or timeline bar reads as "this person" and never as a status.
 * Each solid shade is pre-checked for ≥4.5:1 contrast against white text.
 */
const PALETTE_SOLID = [
  '#3F7A74', // dusty teal
  '#5A5A96', // muted indigo
  '#A65935', // warm terracotta
  '#8B5580', // soft plum
  '#8E6C2E', // ochre
  '#4C6E96', // slate-blue
  '#8F5240', // clay
  '#63704A', // moss
] as const;

const PALETTE_LIGHT = [
  '#D5E2E0', // dusty teal
  '#DBDBE8', // muted indigo
  '#EBDAD3', // warm terracotta
  '#E5DAE3', // soft plum
  '#E6DFD1', // ochre
  '#D8DFE8', // slate-blue
  '#E6D9D5', // clay
  '#DDE0D7', // moss
] as const;

/**
 * Integer finalizer hash (avalanches input bits before reducing to a
 * palette index). A raw `id % 8` was tried first and rejected — with
 * auto-increment ids, any two employees exactly 8 apart (e.g. 1 and 9)
 * would always land on the identical color, reproducing the exact "looks
 * the same" complaint this feature exists to fix. XOR_SEED was picked by
 * checking it gives zero collisions across small, realistic roster sizes.
 */
const XOR_SEED = 192;

function hash32(x: number): number {
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = x ^ (x >>> 16);
  return x >>> 0;
}

function paletteIndex(employeeId: number): number {
  return hash32(employeeId ^ XOR_SEED) % PALETTE_SOLID.length;
}

/** Deterministic solid identity color — the same employee always gets the same shade. */
export function getEmployeeColor(employeeId: number): string {
  return PALETTE_SOLID[paletteIndex(employeeId)];
}

/** Lighter tint of the same employee's color, for subtle fills (e.g. a break notch). */
export function getEmployeeColorLight(employeeId: number): string {
  return PALETTE_LIGHT[paletteIndex(employeeId)];
}
