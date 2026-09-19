import type { Family } from '../types';
import { CARD_W, GEN_Y } from '../types';

const GAP = 40;

/**
 * Placing a new person is a local heuristic, never a re-layout: nothing already
 * arranged is disturbed.
 */
export function place(
  family: Family,
  relation: { kind: 'child' | 'spouse'; of: string[] } | null,
  viewportCentre: { x: number; y: number },
): { x: number; y: number } {
  const at = (id: string) => family.people.find((p) => p.id === id)?.position;

  if (relation?.kind === 'spouse') {
    const partner = at(relation.of[0] ?? '');
    if (partner) return { x: partner.x + CARD_W + GAP, y: partner.y };
  }

  if (relation?.kind === 'child') {
    const parents = relation.of.map(at).filter((p) => p !== undefined);
    if (parents.length) {
      const midX = parents.reduce((s, p) => s + p.x, 0) / parents.length;
      const y = Math.max(...parents.map((p) => p.y)) + GEN_Y;
      // offset right of the last sibling already on that row
      const row = family.people.filter((p) => p.position && Math.abs(p.position.y - y) < 1);
      const rightmost = row.length ? Math.max(...row.map((p) => p.position!.x)) : null;
      return { x: rightmost === null ? midX : rightmost + CARD_W + GAP, y };
    }
  }

  return { x: viewportCentre.x - CARD_W / 2, y: viewportCentre.y };
}
