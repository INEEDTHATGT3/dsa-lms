/* Stable quiz keys.

   The old scheme was positional -- `s<sectionIdx>-<blockIdx>-q<itemIdx>` -- so
   inserting or reordering ANY block silently remapped every stored answer in
   that lesson onto different questions, corrupting accuracy history with no
   error. Keys are now derived from the question text itself, so they survive
   content edits everywhere except the question being reworded (which SHOULD
   invalidate the old answer).

   Must stay byte-identical to the copy used by renderer/sync-content.mjs --
   that script imports this file rather than reimplementing it. */

/* normalize so whitespace-only edits don't rotate the key */
function norm(s) {
  return String(s).trim().toLowerCase().replace(/\s+/g, ' ');
}

/* FNV-1a 32-bit -> 8 hex chars. Not cryptographic; only needs to be stable
   across Node and the browser, and unique within a single lesson. */
export function qkey(stem) {
  let h = 0x811c9dc5;
  const s = norm(stem);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return 'q' + h.toString(16).padStart(8, '0');
}
