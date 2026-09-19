import type { Family, Person } from '../types';
import { touching } from '../canvas/deriveUnions';

type Props = {
  person: Person;
  family: Family;
  onChange: (person: Person) => void;
  onDelete: () => void;
  onDone: () => void;
};

/** `alive` cannot carry a deathYear, so switching status drops the field. */
function setStatus(person: Person, status: Person['status']): Person {
  if (status === 'dead') return { ...person, status: 'dead' };
  const { deathYear: _dropped, ...rest } = person as Person & { deathYear?: number };
  return { ...rest, status: 'alive' };
}

const label = (family: Family, id: string) => family.people.find((p) => p.id === id)?.name ?? id;

/** Docked right, not over the canvas: you need to see the tree while editing it. */
export function EditPanel({ person, family, onChange, onDelete, onDone }: Props) {
  const set = (patch: Partial<Person>) => onChange({ ...person, ...patch } as Person);

  const confirmDelete = () => {
    const rels = touching(family.relationships, person.id);
    const lines = rels.map((r) => {
      if (r.type === 'marriage')
        return `  marriage to ${label(family, r.from === person.id ? r.to : r.from)}`;
      return r.from === person.id
        ? `  parent of ${label(family, r.to)}`
        : `  child of ${label(family, r.from)}`;
    });
    const detail = rels.length
      ? `\n\nThis also removes ${rels.length} relationship${rels.length > 1 ? 's' : ''}:\n${lines.join('\n')}`
      : '';
    if (confirm(`Delete ${person.name}?${detail}`)) onDelete();
  };

  const upload = async (file: File) => {
    await fetch(`/api/photo?id=${person.id}`, {
      method: 'POST',
      headers: { 'x-filename': file.name },
      body: file,
    });
    alert('Saved to photos-src/. Run `npm run photos` to publish it.');
  };

  return (
    <div className="edit panel">
      <h2>Edit person</h2>

      <label>
        Photo
        <input
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
      </label>

      <label>
        Name
        <input value={person.name} onChange={(e) => set({ name: e.target.value })} />
      </label>

      <label>
        Gender
        <select
          value={person.gender ?? ''}
          onChange={(e) => set({ gender: (e.target.value || undefined) as Person['gender'] })}
        >
          <option value="">—</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </label>

      <label>
        Status
        <select
          value={person.status}
          onChange={(e) => onChange(setStatus(person, e.target.value as Person['status']))}
        >
          <option value="alive">Alive</option>
          <option value="dead">Dead</option>
        </select>
      </label>

      <label>
        Born
        <input
          type="number"
          value={person.birthYear ?? ''}
          onChange={(e) => set({ birthYear: e.target.value ? Number(e.target.value) : undefined })}
        />
      </label>

      <label>
        Died
        <input
          type="number"
          disabled={person.status === 'alive'}
          value={person.status === 'dead' ? (person.deathYear ?? '') : ''}
          onChange={(e) =>
            onChange({
              ...person,
              status: 'dead',
              deathYear: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
      </label>

      <label className="check">
        <input
          type="checkbox"
          checked={!!person.unknown}
          onChange={(e) => set({ unknown: e.target.checked || undefined })}
        />
        Unknown ancestor
      </label>

      <div className="edit__actions">
        <button onClick={confirmDelete}>Delete</button>
        <button onClick={onDone}>Done</button>
      </div>
    </div>
  );
}
