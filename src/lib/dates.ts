import type { Person } from '../types';

/** Genealogical convention: a trailing en dash for the living, no "b." prefix. */
export function dateLine(p: Person): string {
  if (p.status === 'alive') return p.birthYear ? `${p.birthYear}–` : '';
  if (p.birthYear && p.deathYear) return `${p.birthYear}–${p.deathYear}`;
  if (p.birthYear) return `${p.birthYear}–?`;
  if (p.deathYear) return `?–${p.deathYear}`;
  return '';
}
