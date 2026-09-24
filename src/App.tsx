import { Suspense, lazy, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import type { Family } from './types';
import { Tree } from './canvas/Tree';
import { useKeyboardViewport } from './canvas/useKeyboardViewport';
import { Search } from './Search';
import { ListView } from './ListView';

// tree-shaken out of the production bundle: the boundary is statically false
const Admin = import.meta.env.DEV ? lazy(() => import('./admin/Admin')) : null;

function Shell({ initial }: { initial: Family }) {
  const [family, setFamily] = useState(initial);
  const [foundId, setFoundId] = useState<string | null>(null);
  const [listView, setListView] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [snap, setSnap] = useState(true);
  const [photoV, setPhotoV] = useState(0);
  useKeyboardViewport();

  const move = (id: string, position: { x: number; y: number }) =>
    setFamily((f) => ({
      ...f,
      people: f.people.map((p) => (p.id === id ? { ...p, position } : p)),
    }));

  // clicking cycles the selection: first picks, second pairs, third starts over
  const pick = (id: string | null) => {
    if (!Admin) return;
    if (!id) return setSelected([]);
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length >= 2 ? [id] : [...s, id],
    );
  };

  return (
    <>
      <h1 className="family-name">{family.familyName}</h1>

      <Tree
        family={family}
        admin={!!Admin}
        foundId={foundId}
        selected={selected}
        snap={snap}
        photoV={photoV}
        onMove={Admin ? move : undefined}
        onSelect={pick}
      />

      <Search family={family} onFound={setFoundId} />

      <button className="list-toggle" onClick={() => setListView((v) => !v)}>
        {listView ? 'Tree' : 'List'}
      </button>
      {listView && <ListView family={family} />}

      {Admin && (
        <Suspense fallback={null}>
          <Admin
            family={family}
            setFamily={setFamily}
            selected={selected}
            setSelected={setSelected}
            snap={snap}
            setSnap={setSnap}
            onPhotoChange={() => setPhotoV((v) => v + 1)}
          />
        </Suspense>
      )}
    </>
  );
}

export const App = ({ initial }: { initial: Family }) => (
  <ReactFlowProvider>
    <Shell initial={initial} />
  </ReactFlowProvider>
);
