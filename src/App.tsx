import { Suspense, lazy, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import type { Family } from './types';
import { Tree } from './canvas/Tree';
import { useKeyboardViewport } from './canvas/useKeyboardViewport';
import { Search } from './Search';
import { ListView } from './ListView';

// tree-shaken out of the production bundle: the boundary is statically false
const Admin = import.meta.env.DEV ? lazy(() => import('./admin/Admin')) : null;

export type Click = { id: string | null; n: number };

function Shell({ initial }: { initial: Family }) {
  const [family, setFamily] = useState(initial);
  const [foundId, setFoundId] = useState<string | null>(null);
  const [listView, setListView] = useState(false);
  const [click, setClick] = useState<Click>({ id: null, n: 0 });
  useKeyboardViewport();

  const move = (id: string, position: { x: number; y: number }) =>
    setFamily((f) => ({
      ...f,
      people: f.people.map((p) => (p.id === id ? { ...p, position } : p)),
    }));

  return (
    <>
      <h1 className="family-name">{family.familyName}</h1>

      <Tree
        family={family}
        admin={!!Admin}
        foundId={foundId}
        onMove={Admin ? move : undefined}
        onSelect={(id) => setClick((c) => ({ id, n: c.n + 1 }))}
      />

      <Search family={family} onFound={setFoundId} />

      <button className="list-toggle" onClick={() => setListView((v) => !v)}>
        {listView ? 'Tree' : 'List'}
      </button>
      {listView && <ListView family={family} />}

      {Admin && (
        <Suspense fallback={null}>
          <Admin family={family} setFamily={setFamily} click={click} />
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
