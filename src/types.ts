export type Person = {
  id: string;
  name: string;
  gender?: 'male' | 'female';
  unknown?: true;
  position?: { x: number; y: number };
} & (
  | { status: 'alive'; birthYear?: number }
  | { status: 'dead'; birthYear?: number; deathYear?: number }
);

export type Relationship = {
  id: string;
  from: string;
  to: string;
  type: 'marriage' | 'parent';
};

export type Family = {
  familyName: string;
  headId: string;
  people: Person[];
  relationships: Relationship[];
};

/** Card geometry and layout spacing, shared by the canvas and the tidy pass. */
export const CARD_W = 140;
export const CARD_H = 160;

/** Sibling bar sits one card-height plus 45px below the parents' top edge. */
export const UNION_DROP = CARD_H + 45;

/**
 * The union node sits on the marriage bar, at CARD_H / 2. `smoothstep` splits
 * at the midpoint between its source and target, so the generation gap is
 * chosen to land that split exactly on UNION_DROP -- which is what puts the
 * sibling bar where it belongs without a custom edge component.
 */
export const GEN_Y = 2 * UNION_DROP - CARD_H / 2;
