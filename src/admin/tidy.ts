import type { Family, Person } from '../types';
import { CARD_W, GEN_Y } from '../types';
import { generations } from '../lib/generations';
import { buildUnits, type Unit } from './units';

const GAP = 40;

/**
 * A family tree is not a general DAG, so it does not need a general layout
 * engine. Generation gives y; a two-pass walk gives x: children are packed
 * left to right, then each unit is centred over the span of its children.
 */
export function tidy(family: Family): Person[] {
  const { units, unitOf, byId } = buildUnits(family);
  const gen = generations(family);
  const x = new Map<string, number>();

  const width = (u: Unit) => u.members.length * CARD_W + (u.members.length - 1) * GAP;

  const childUnits = (u: Unit): Unit[] => {
    const seen = new Set<string>();
    const kids: { unit: Unit; born: number }[] = [];
    for (const union of u.unions) {
      for (const childId of union.childIds) {
        const child = unitOf.get(childId);
        if (!child || seen.has(child.id) || child === u) continue;
        seen.add(child.id);
        kids.push({ unit: child, born: byId.get(childId)?.birthYear ?? Infinity });
      }
    }
    return kids.sort((a, b) => a.born - b.born).map((k) => k.unit);
  };

  const placed = new Set<string>();

  // post-order: place the children, then centre the parents over them
  const layout = (u: Unit, left: number): { width: number; ids: string[] } => {
    placed.add(u.id);
    const kids = childUnits(u).filter((k) => !placed.has(k.id));
    const own = width(u);

    if (!kids.length) {
      x.set(u.id, left);
      return { width: own, ids: [u.id] };
    }

    let cursor = left;
    let ids: string[] = [];
    for (const kid of kids) {
      const sub = layout(kid, cursor);
      cursor += sub.width + GAP;
      ids = ids.concat(sub.ids);
    }
    const span = cursor - left - GAP;

    if (own > span) {
      // the unit is wider than its children: slide the children back to centre
      const shift = (own - span) / 2;
      for (const id of ids) x.set(id, (x.get(id) ?? 0) + shift);
      x.set(u.id, left);
      return { width: own, ids: [u.id, ...ids] };
    }

    x.set(u.id, left + (span - own) / 2);
    return { width: span, ids: [u.id, ...ids] };
  };

  // roots first, head's line of descent leftmost, then anything disconnected
  const hasParent = (u: Unit) =>
    u.members.some((id) => family.relationships.some((r) => r.type === 'parent' && r.to === id));
  const headUnit = unitOf.get(family.headId);
  const roots = units.filter((u) => !hasParent(u));
  const ordered = [
    ...roots.filter((u) => u === headUnit || u.members.some((m) => m === family.headId)),
    ...roots.filter((u) => u !== headUnit && !u.members.includes(family.headId)),
  ];

  let cursor = 0;
  for (const root of [...ordered, ...units]) {
    if (placed.has(root.id)) continue;
    cursor += layout(root, cursor).width + GAP * 3;
  }

  // anchor: the head sits at x = 0, permanently centred
  const headX = headUnit ? (x.get(headUnit.id) ?? 0) + headUnit.members.indexOf(family.headId) * (CARD_W + GAP) : 0;

  return family.people.map((person) => {
    const unit = unitOf.get(person.id);
    if (!unit) return person;
    const slot = unit.members.indexOf(person.id);
    return {
      ...person,
      position: {
        x: (x.get(unit.id) ?? 0) + slot * (CARD_W + GAP) - headX,
        y: (gen.get(person.id) ?? 0) * GEN_Y,
      },
    };
  });
}
