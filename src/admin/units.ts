import type { Family, Person } from '../types';
import { deriveUnions, type Union } from '../canvas/deriveUnions';

/**
 * A drawing unit is one person plus everyone they had children or a marriage
 * with, kept adjacent on the row. A remarriage puts the pivot in the middle.
 */
export type Unit = {
  id: string;
  members: string[];
  unions: Union[];
};

const isMale = (p: Person | undefined) => p?.gender === 'male';

export function buildUnits(family: Family) {
  const byId = new Map(family.people.map((p) => [p.id, p]));
  const unions = deriveUnions(family);

  const partners = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (a === b) return;
    (partners.get(a) ?? partners.set(a, new Set()).get(a)!).add(b);
    (partners.get(b) ?? partners.set(b, new Set()).get(b)!).add(a);
  };
  for (const r of family.relationships) if (r.type === 'marriage') link(r.from, r.to);
  for (const u of unions) for (const a of u.parentIds) for (const b of u.parentIds) link(a, b);

  const unitOf = new Map<string, Unit>();
  const units: Unit[] = [];

  for (const person of family.people) {
    if (unitOf.has(person.id)) continue;
    const mates = [...(partners.get(person.id) ?? [])].filter((id) => !unitOf.has(id));

    let members: string[];
    if (mates.length === 0) members = [person.id];
    else if (mates.length === 1) {
      // male partner on the left by convention, where both genders are known
      members = isMale(byId.get(mates[0]!)) && !isMale(byId.get(person.id))
        ? [mates[0]!, person.id]
        : [person.id, mates[0]!];
    } else {
      members = [mates[0]!, person.id, ...mates.slice(1)];
    }

    const unit: Unit = {
      id: `unit:${person.id}`,
      members,
      unions: unions.filter((u) => u.parentIds.every((id) => members.includes(id))),
    };
    units.push(unit);
    for (const id of members) unitOf.set(id, unit);
  }

  return { units, unitOf, unions, byId };
}
