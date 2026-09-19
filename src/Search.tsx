import { useEffect, useMemo, useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { Family } from './types';
import { CARD_H, CARD_W } from './types';
import { search } from './lib/search';
import { dateLine } from './lib/dates';

export function Search({ family, onFound }: { family: Family; onFound: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const { setCenter } = useReactFlow();
  const results = useMemo(() => search(family.people, query), [family.people, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /INPUT|SELECT/.test(e.target.tagName);
      if (e.key === '/' && !typing) {
        e.preventDefault();
        input.current?.focus();
      }
      if (e.key === 'Escape') {
        setQuery('');
        input.current?.blur();
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  const choose = (id: string) => {
    const person = family.people.find((p) => p.id === id);
    if (!person?.position) return;
    setCenter(person.position.x + CARD_W / 2, person.position.y + CARD_H / 2, {
      zoom: 1.2,
      duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500,
    });
    onFound(id);
    setQuery('');
  };

  return (
    <div className="search">
      {results.length > 0 && (
        <ul className="panel">
          {results.map((p) => (
            <li key={p.id}>
              <button onClick={() => choose(p.id)}>
                <span>{p.name}</span>
                <span className="dates">{dateLine(p)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={input}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find someone"
        aria-label="Find someone"
      />
    </div>
  );
}
