import type { Family, Relationship } from '../types';

export type Union = {
  id: string;
  parentIds: string[];
  childIds: string[];
};

const unionId = (parentIds: string[]) => `u:${parentIds.join('+')}`;

/**
 * Children sharing an identical parent set form one union. Recomputed on load,
 * never stored, so it cannot fall out of sync with the edges.
 */
export function deriveUnions(family: Family): Union[] {
  const parentsOf = new Map<string, string[]>();
  for (const r of family.relationships) {
    if (r.type !== 'parent') continue;
    const list = parentsOf.get(r.to);
    if (list) list.push(r.from);
    else parentsOf.set(r.to, [r.from]);
  }

  const byKey = new Map<string, Union>();
  for (const [childId, parents] of parentsOf) {
    const parentIds = [...new Set(parents)].sort();
    const id = unionId(parentIds);
    const existing = byKey.get(id);
    if (existing) existing.childIds.push(childId);
    else byKey.set(id, { id, parentIds, childIds: [childId] });
  }
  return [...byKey.values()];
}

export const marriages = (rels: Relationship[]) => rels.filter((r) => r.type === 'marriage');

/** Relationships that would dangle if `id` were deleted. */
export const touching = (rels: Relationship[], id: string) =>
  rels.filter((r) => r.from === id || r.to === id);
