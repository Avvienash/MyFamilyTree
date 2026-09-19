import { useMemo } from 'react';
import type { Family } from './types';
import { generations } from './lib/generations';
import { dateLine } from './lib/dates';

/**
 * The keyboard and assistive route, and what a search engine reads.
 * It also works if the canvas fails.
 */
export function ListView({ family }: { family: Family }) {
  const rows = useMemo(() => {
    const gen = generations(family);
    const byGen = new Map<number, typeof family.people>();
    for (const p of family.people) {
      const g = gen.get(p.id) ?? 0;
      byGen.set(g, [...(byGen.get(g) ?? []), p]);
    }
    return [...byGen.entries()].sort((a, b) => a[0] - b[0]);
  }, [family]);

  return (
    <div className="list-view">
      {rows.map(([g, people]) => (
        <section key={g}>
          <h2>Generation {g + 1}</h2>
          <ol>
            {people.map((p) => (
              <li key={p.id}>
                <span>{p.unknown ? 'Unknown' : p.name}</span>
                <span className="dates">{dateLine(p)}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
