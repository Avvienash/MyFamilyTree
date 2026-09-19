import type { Family } from '../types';

/**
 * Longest parent-chain depth, roots at 0. Spouses are pulled to the deeper of
 * the pair so a couple always shares a row. Cycle-safe: the validator rejects
 * cycles, but the canvas must not hang on a file that slipped through.
 */
export function generations(family: Family): Map<string, number> {
  const parentsOf = new Map<string, string[]>();
  for (const r of family.relationships) {
    if (r.type === 'parent') parentsOf.set(r.to, [...(parentsOf.get(r.to) ?? []), r.from]);
  }

  const gen = new Map<string, number>();
  const visiting = new Set<string>();

  const depth = (id: string): number => {
    const seen = gen.get(id);
    if (seen !== undefined) return seen;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const parents = parentsOf.get(id) ?? [];
    const d = parents.length ? Math.max(...parents.map(depth)) + 1 : 0;
    visiting.delete(id);
    gen.set(id, d);
    return d;
  };

  for (const p of family.people) depth(p.id);

  // Pull partners onto a shared row: spouses, and co-parents of the same child.
  const level = (ids: string[]) => {
    const d = Math.max(...ids.map((id) => gen.get(id) ?? 0));
    for (const id of ids) gen.set(id, d);
  };
  for (let pass = 0; pass < 3; pass++) {
    for (const parents of parentsOf.values()) level(parents);
    for (const r of family.relationships) if (r.type === 'marriage') level([r.from, r.to]);
  }

  return gen;
}
