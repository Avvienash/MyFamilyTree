import { useEffect, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { Family, Person, Relationship } from '../types';
import { touching } from '../canvas/deriveUnions';
import { EditPanel } from './EditPanel';
import { tidy } from './tidy';
import { place } from './placement';

type Props = {
  family: Family;
  setFamily: (update: (f: Family) => Family) => void;
  selected: string[];
  setSelected: (ids: string[]) => void;
  snap: boolean;
  setSnap: (on: boolean) => void;
  onPhotoChange: () => void;
};

const nextId = (used: Set<string>, prefix: string) => {
  for (let n = 1; ; n++) {
    const id = `${prefix}${String(n).padStart(3, '0')}`;
    if (!used.has(id)) return id;
  }
};

export default function Admin({
  family,
  setFamily,
  selected,
  setSelected,
  snap,
  setSnap,
  onPhotoChange,
}: Props) {
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'failed'>('idle');
  const { screenToFlowPosition } = useReactFlow();

  const edit = (update: (f: Family) => Family) => {
    setFamily(update);
    setDirty(true);
  };

  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => dirty && e.preventDefault();
    addEventListener('beforeunload', guard);
    return () => removeEventListener('beforeunload', guard);
  }, [dirty]);

  const person = (id: string) => family.people.find((p) => p.id === id);
  const name = (id: string) => person(id)?.name ?? id;

  const addPerson = () => {
    const id = nextId(new Set(family.people.map((p) => p.id)), 'p');
    const centre = screenToFlowPosition({ x: innerWidth / 2, y: innerHeight / 2 });
    const fresh: Person = { id, name: 'New person', status: 'alive' };
    edit((f) => ({ ...f, people: [...f.people, { ...fresh, position: place(f, null, centre) }] }));
    setSelected([id]);
  };

  const relate = (from: string, to: string, type: Relationship['type']) => {
    const id = nextId(
      new Set(family.relationships.map((r) => r.id)),
      type === 'marriage' ? 'm' : 'r',
    );
    edit((f) => ({ ...f, relationships: [...f.relationships, { id, from, to, type }] }));
    setSelected([]);
  };

  const remove = (id: string) => {
    const rels = touching(family.relationships, id);
    const detail = rels.length
      ? `\n\nThis also removes ${rels.length} relationship${rels.length > 1 ? 's' : ''}:\n` +
        rels
          .map((r) =>
            r.type === 'marriage'
              ? `  marriage to ${name(r.from === id ? r.to : r.from)}`
              : r.from === id
                ? `  parent of ${name(r.to)}`
                : `  child of ${name(r.from)}`,
          )
          .join('\n')
      : '';
    if (!confirm(`Delete ${name(id)}?${detail}`)) return;
    edit((f) => ({
      ...f,
      people: f.people.filter((p) => p.id !== id),
      relationships: f.relationships.filter((r) => r.from !== id && r.to !== id),
    }));
    setSelected([]);
  };

  const runTidy = () => {
    if (!confirm('Tidy rearranges everyone and discards positions you set by hand. Continue?')) return;
    edit((f) => ({ ...f, people: tidy(f) }));
  };

  const save = async () => {
    setSaving('saving');
    try {
      const res = await fetch('/api/save', { method: 'POST', body: JSON.stringify(family) });
      if (!res.ok) throw new Error();
      setDirty(false);
      setSaving('idle');
    } catch {
      setSaving('failed');
    }
  };

  const [a, b] = selected;
  const one = selected.length === 1 ? person(selected[0]!) : undefined;

  return (
    <>
      <div className="toolbar panel">
        <button onClick={addPerson}>Add person</button>
        <button onClick={runTidy}>Tidy</button>
        <label className="toggle">
          <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
          Snap to grid
        </label>
        <span className="toolbar__sep" />
        <span className={`status status--${dirty ? 'dirty' : 'clean'}`}>
          {saving === 'failed'
            ? 'Save failed'
            : saving === 'saving'
              ? 'Saving…'
              : dirty
                ? 'Unsaved changes'
                : 'Saved to disk'}
        </span>
        <button onClick={save} disabled={!dirty || saving === 'saving'}>
          Save
        </button>
      </div>

      {selected.length === 0 && (
        <div className="hint panel">Click a person to edit. Click a second to link them.</div>
      )}

      {a && b && (
        <div className="link-bar panel">
          <div className="link-bar__who">
            <strong>{name(a)}</strong> and <strong>{name(b)}</strong>
          </div>
          <button onClick={() => relate(a, b, 'marriage')}>Marriage</button>
          <button onClick={() => relate(a, b, 'parent')}>{name(a)} is the parent</button>
          <button onClick={() => relate(b, a, 'parent')}>{name(b)} is the parent</button>
          <button onClick={() => setSelected([])}>Clear</button>
        </div>
      )}

      {one && (
        <EditPanel
          person={one}
          onChange={(updated) =>
            edit((f) => ({
              ...f,
              people: f.people.map((p) => (p.id === updated.id ? updated : p)),
            }))
          }
          onPhotoChange={onPhotoChange}
          onDelete={() => remove(one.id)}
          onDone={() => setSelected([])}
        />
      )}
    </>
  );
}
