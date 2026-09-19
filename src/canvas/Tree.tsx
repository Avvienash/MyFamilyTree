import { useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  useReactFlow,
  useStore,
  type BuiltInEdge,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { Family, Person } from '../types';
import { CARD_H, CARD_W } from '../types';
import { deriveUnions, marriages } from './deriveUnions';
import { PersonNode } from './PersonNode';
import { UnionNode } from './UnionNode';
import { useDetailLevel } from './useDetailLevel';

const nodeTypes = { person: PersonNode, union: UnionNode };

const at = (p: Person) => p.position ?? { x: 0, y: 0 };

function build(family: Family, foundId: string | null) {
  const byId = new Map(family.people.map((p) => [p.id, p]));
  const nodes: Node[] = family.people.map((person) => ({
    id: person.id,
    type: 'person',
    position: at(person),
    data: { person, highlighted: person.id === foundId },
    width: CARD_W,
    height: CARD_H,
  }));
  const edges: BuiltInEdge[] = [];

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
      type: 'straight',
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
      });
    }
  }

  return { nodes, edges };
}

type Props = {
  family: Family;
  admin: boolean;
  foundId: string | null;
  onMove?: (id: string, position: { x: number; y: number }) => void;
  onSelect?: (id: string | null) => void;
};

export function Tree({ family, admin, foundId, onMove, onSelect }: Props) {
  const { nodes, edges } = useMemo(() => build(family, foundId), [family, foundId]);
  const level = useDetailLevel();
  const { setCenter, fitView } = useReactFlow();
  const introDone = useRef(false);

  // fitView needs React Flow to have measured at least one node; until then it
  // silently does nothing. Waiting on this is what makes the intro reliable.
  const measured = useStore((s) => {
    for (const node of s.nodeLookup.values()) if (node.measured?.width) return true;
    return false;
  });

  // one orchestrated moment on load: hold on the head, then pull back to fit
  useEffect(() => {
    if (!measured || introDone.current) return;
    introDone.current = true;

    const head = family.people.find((p) => p.id === family.headId);
    const fit = (duration: number) => fitView({ padding: 0.15, duration });
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
  }, [measured, family, fitView, setCenter]);

  const onNodesChange = (changes: NodeChange[]) => {
    if (!onMove) return;
    for (const c of changes) {
      if (c.type === 'position' && c.position && c.id) onMove(c.id, c.position);
    }
  };

  return (
    <div className={`app ${level}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={(_, n) => onSelect?.(n.id)}
        onPaneClick={() => onSelect?.(null)}
        nodesDraggable={admin}
        elementsSelectable={admin}
        nodesConnectable={false}
        onlyRenderVisibleElements
        panOnDrag
        zoomOnScroll
        minZoom={0.15}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      />
    </div>
  );
}
