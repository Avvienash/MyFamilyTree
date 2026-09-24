import { useEffect, useMemo, useRef } from 'react';
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  useReactFlow,
  useStore,
  type Edge,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { Family, Person } from '../types';
import { CARD_H, CARD_W, GRID } from '../types';
import { deriveUnions, marriages } from './deriveUnions';
import { MarriageEdge } from './MarriageEdge';
import { PersonNode } from './PersonNode';
import { UnionNode } from './UnionNode';

const nodeTypes = { person: PersonNode, union: UnionNode };
const edgeTypes = { marriage: MarriageEdge };

const at = (p: Person) => p.position ?? { x: 0, y: 0 };

/** True when another card sits in the horizontal gap between two partners. */
function blocked(people: Person[], a: Person, b: Person) {
  const [l, r] = at(a).x <= at(b).x ? [a, b] : [b, a];
  const left = at(l).x + CARD_W;
  const right = at(r).x;
  const row = (at(l).y + at(r).y) / 2;
  return people.some(
    (p) =>
      p.id !== a.id &&
      p.id !== b.id &&
      Math.abs(at(p).y - row) < CARD_H &&
      at(p).x + CARD_W > left &&
      at(p).x < right,
  );
}

function build(family: Family, foundId: string | null, selected: string[], photoV: number) {
  const byId = new Map(family.people.map((p) => [p.id, p]));

  const nodes: Node[] = family.people.map((person) => ({
    id: person.id,
    type: 'person',
    position: at(person),
    data: {
      person,
      highlighted: person.id === foundId,
      selected: selected.includes(person.id),
      photoV,
    },
    width: CARD_W,
    height: CARD_H,
  }));
  const edges: Edge[] = [];

  for (const m of marriages(family.relationships)) {
    const a = byId.get(m.from);
    const b = byId.get(m.to);
    if (!a || !b) continue;
    // order by x so the bar always runs left to right
    const [left, right] = at(a).x <= at(b).x ? [a, b] : [b, a];
    edges.push({
      id: m.id,
      source: left.id,
      sourceHandle: 'r',
      target: right.id,
      targetHandle: 'l',
      type: 'marriage',
      data: { detour: blocked(family.people, a, b) },
    });
  }

  for (const union of deriveUnions(family)) {
    const parents = union.parentIds.map((id) => byId.get(id)).filter((p) => p !== undefined);
    if (!parents.length) continue;

    // on the marriage bar: the stem descends from its midpoint
    const x = parents.reduce((s, p) => s + at(p).x + CARD_W / 2, 0) / parents.length;
    const y = parents.reduce((s, p) => s + at(p).y, 0) / parents.length + CARD_H / 2;

    nodes.push({
      id: union.id,
      type: 'union',
      position: { x, y },
      data: {},
      draggable: false,
      selectable: false,
      // 1px, not 0: React Flow never measures a zero-size node, so it records
      // no handle bounds and silently drops every edge attached to it.
      width: 1,
      height: 1,
    });

    for (const childId of union.childIds) {
      if (!byId.has(childId)) continue;
      edges.push({
        id: `${union.id}->${childId}`,
        source: union.id,
        target: childId,
        targetHandle: 't',
        type: 'smoothstep',
        pathOptions: { borderRadius: 8 },
      } as Edge);
    }
  }

  return { nodes, edges };
}

type Props = {
  family: Family;
  admin: boolean;
  foundId: string | null;
  selected?: string[];
  snap?: boolean;
  photoV?: number;
  onMove?: (id: string, position: { x: number; y: number }) => void;
  onSelect?: (id: string | null) => void;
};

export function Tree({
  family,
  admin,
  foundId,
  selected = [],
  snap = false,
  photoV = 0,
  onMove,
  onSelect,
}: Props) {
  const { nodes, edges } = useMemo(
    () => build(family, foundId, selected, photoV),
    [family, foundId, selected, photoV],
  );
  const { setCenter, fitBounds } = useReactFlow();
  const introDone = useRef(false);

  // fitView derives its bounds from *measured* nodes, so it quietly fits to
  // whatever subset happens to be on screen. Positions and card size are known
  // up front, so the real bounds need no measurement at all.
  const bounds = useMemo(() => {
    const placed = family.people.map(at);
    if (!placed.length) return null;
    const x = Math.min(...placed.map((p) => p.x));
    const y = Math.min(...placed.map((p) => p.y));
    return {
      x,
      y,
      width: Math.max(...placed.map((p) => p.x)) + CARD_W - x,
      height: Math.max(...placed.map((p) => p.y)) + CARD_H - y,
    };
  }, [family]);

  // the container still has to be measured before a fit means anything
  const ready = useStore((s) => s.width > 0 && s.height > 0);

  // one orchestrated moment on load: hold on the head, then pull back to fit
  useEffect(() => {
    if (!ready || !bounds || introDone.current) return;
    introDone.current = true;

    const head = family.people.find((p) => p.id === family.headId);
    const fit = (duration: number) => fitBounds(bounds, { padding: 0.15, duration });
    const events = ['pointerdown', 'wheel', 'keydown'] as const;

    if (!head || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      fit(0);
      return;
    }

    const { x, y } = at(head);
    setCenter(x + CARD_W / 2, y + CARD_H / 2, { zoom: 1, duration: 0 });

    let done = false;
    const pull = (duration: number) => {
      if (done) return;
      done = true;
      fit(duration);
      for (const ev of events) removeEventListener(ev, skip);
    };
    const skip = () => pull(0);

    // Deliberately no cleanup: this is a one-shot, and a cleanup would let an
    // unrelated dependency change cancel the pull-back mid-flight. `pull` is
    // idempotent and detaches its own listeners.
    setTimeout(() => pull(1500), 600);
    for (const ev of events) addEventListener(ev, skip);
  }, [ready, bounds, family, fitBounds, setCenter]);

  const onNodesChange = (changes: NodeChange[]) => {
    if (!onMove) return;
    for (const c of changes) {
      if (c.type === 'position' && c.position && c.id) onMove(c.id, c.position);
    }
  };

  return (
    <div className="app">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={(_, n) => onSelect?.(n.id)}
        onPaneClick={() => onSelect?.(null)}
        nodesDraggable={admin}
        elementsSelectable={admin}
        nodesConnectable={false}
        snapToGrid={snap}
        snapGrid={[GRID, GRID]}
        onlyRenderVisibleElements
        panOnDrag
        zoomOnScroll
        minZoom={0.15}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        {snap && (
          <Background variant={BackgroundVariant.Dots} gap={GRID} size={1} color="var(--line)" />
        )}
      </ReactFlow>
    </div>
  );
}
