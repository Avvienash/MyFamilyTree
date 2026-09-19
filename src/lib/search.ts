import type { Person } from '../types';

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/**
 * Token-based AND matching, so "ahmad ismail" finds "Ahmad bin Ismail",
 * which a substring match would miss. Unknown nodes are excluded.
 */
export function search(people: Person[], query: string): Person[] {
  const tokens = fold(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  return people
    .filter((p) => !p.unknown)
    .filter((p) => {
      const name = fold(p.name);
      return tokens.every((t) => name.includes(t));
    })
    .slice(0, 8);
}
