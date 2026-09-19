import { useEffect, useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { Family, Person, Relationship } from '../types';
import type { Click } from '../App';
import { EditPanel } from './EditPanel';
import { tidy } from './tidy';
import { place } from './placement';

type Props = {
  family: Family;
  setFamily: (update: (f: Family) => Family) => void;
  click: Click;
};

const nextId = (used: Set<string>, prefix: string) => {
  for (let n = 1; ; n++) {
    const id = `${prefix}${String(n).padStart(3, '0')}`;
    if (!used.has(id)) return id;
  }
};

export default function Admin({ family, setFamily, click }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [pick, setPick] = useState<string[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const { screenToFlowPosition } = useReactFlow();
  const seen = useRef(click.n);

  const edit = (update: (f: Family) => Family) => {
    setFamily(update);
    setDirty(true);
  };

  // node clicks either pick relationship endpoints or open the edit panel
  useEffect(() => {
    if (click.n === seen.current) return;
    seen.current = click.n;

    if (!pick) {
      setSelected(click.id);
      return;
    }
    if (!click.id) return setPick([]);

    const next = [...pick, click.id];
    if (next.length < 2) return setPick(next);

    const [from, to] = next as [string, string];
    setPick(null);
    if (from === to) return;
    const type = confirm(`OK = marriage\nCancel = ${from} is parent of ${to}`)
      ? 'marriage'
      : 'parent';
    const rel: Relationship = {
      id: nextId(new Set(family.relationships.map((r) => r.id)), type === 'marriage' ? 'm' : 'r'),
      from,
      to,
      type,
    };
    edit((f) => ({ ...f, relationships: [...f.relationships, rel] }));
  }, [click]);

  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => dirty && e.preventDefault();
    addEventListener('beforeunload', guard);
    return () => removeEventListener('beforeunload', guard);
  }, [dirty]);

  const addPerson = () => {
    const id = nextId(new Set(family.people.map((p) => p.id)), 'p');
    const centre = screenToFlowPosition({ x: innerWidth / 2, y: innerHeight / 2 });
    const person: Person = { id, name: 'New person', status: 'alive' };
    edit((f) => ({ ...f, people: [...f.people, { ...person, position: place(f, null, centre) }] }));
    setSelected(id);
  };

  const runTidy = () => {
    if (!confirm('Tidy discards every manual position. Continue?')) return;
    edit((f) => ({ ...f, people: tidy(f) }));
  };

  const remove = (id: string) => {
    edit((f) => ({
      ...f,
      people: f.people.filter((p) => p.id !== id),
      relationships: f.relationships.filter((r) => r.from !== id && r.to !== id),
    }));
    setSelected(null);
  };

  const save = async () => {
    const res = await fetch('/api/save', { method: 'POST', body: JSON.stringify(family) });
    if (res.ok) setDirty(false);
    else alert('Save failed');
  };

  const person = family.people.find((p) => p.id === selected);

  return (
    <>
      <div className="toolbar panel">
        <span className="toolbar__status">Admin · {dirty ? 'Unsaved' : 'Saved'}</span>
        <button onClick={addPerson}>+ Person</button>
        <button onClick={() => setPick(pick ? null : [])}>
          {pick ? 'Cancel' : '+ Relationship'}
        </button>
        <button onClick={runTidy}>Tidy</button>
        <button onClick={save} disabled={!dirty}>
          Save
        </button>
      </div>

      {pick && (
        <div className="hint panel">
          Click two people. The first is the parent.{pick.length ? ' One selected.' : ''}
        </div>
      )}

      {person && !pick && (
        <EditPanel
          person={person}
          family={family}
          onChange={(updated) =>
            edit((f) => ({
              ...f,
              people: f.people.map((p) => (p.id === updated.id ? updated : p)),
            }))
          }
          onDelete={() => remove(person.id)}
          onDone={() => setSelected(null)}
        />
      )}
    </>
  );
}
