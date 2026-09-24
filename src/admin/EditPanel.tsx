import { useState } from 'react';
import type { Person } from '../types';

type Props = {
  person: Person;
  onChange: (person: Person) => void;
  onPhotoChange: () => void;
  onDelete: () => void;
  onDone: () => void;
};

/** `alive` cannot carry a deathYear, so switching status drops the field. */
function setStatus(person: Person, status: Person['status']): Person {
  if (status === 'dead') return { ...person, status: 'dead' };
  const { deathYear: _dropped, ...rest } = person as Person & { deathYear?: number };
  return { ...rest, status: 'alive' };
}

/** Docked right, not over the canvas: you need to see the tree while editing it. */
export function EditPanel({ person, onChange, onPhotoChange, onDelete, onDone }: Props) {
  const [uploading, setUploading] = useState(false);
  const set = (patch: Partial<Person>) => onChange({ ...person, ...patch } as Person);

  const upload = async (file: File) => {
    setUploading(true);
    const res = await fetch(`/api/photo?id=${person.id}`, {
      method: 'POST',
      headers: { 'x-filename': file.name },
      body: file,
    });
    setUploading(false);
    if (res.ok) onPhotoChange();
    else alert('Photo upload failed');
  };

  return (
    <div className="edit panel">
      <h2>{person.name}</h2>

      <label>
        Photo
        <input
          type="file"
          accept="image/*"
          disabled={uploading}
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
        <button onClick={onDelete}>Delete</button>
        <button onClick={onDone}>Done</button>
      </div>
    </div>
  );
}
