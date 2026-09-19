import { memo, useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { Person } from '../types';
import { avatar, initials } from '../lib/avatar';
import { dateLine } from '../lib/dates';

export type PersonNodeData = { person: Person; highlighted: boolean };
export type PersonNodeType = Node<PersonNodeData, 'person'>;

// A node with more than one handle of a type must name them, or React Flow
// cannot resolve the edge and silently drops it. 't' takes the child drop,
// 'l'/'r' carry the marriage bar. Nothing ever leaves a person's bottom edge:
// the stem descends from the union node, not from a parent card.
const handles = (
  <>
    <Handle type="target" position={Position.Top} id="t" isConnectable={false} />
    <Handle type="target" position={Position.Left} id="l" isConnectable={false} />
    <Handle type="source" position={Position.Right} id="r" isConnectable={false} />
  </>
);

function Portrait({ person }: { person: Person }) {
  const [failed, setFailed] = useState(false);

  if (person.unknown) return <div className="portrait portrait--blank">?</div>;

  if (!failed) {
    return (
      <img
        className="portrait"
        src={`/photos/${person.id}.webp`}
        alt={person.name}
        width={64}
        height={64}
        onError={() => setFailed(true)}
      />
    );
  }

  const { disc, letter } = avatar(person.id);
  return (
    <div
      className="portrait portrait--initials"
      style={{ background: disc, color: letter }}
      aria-label={person.name}
      role="img"
    >
      {initials(person.name)}
    </div>
  );
}

function PersonNodeInner({ data }: NodeProps<PersonNodeType>) {
  const { person, highlighted } = data;
  const dates = dateLine(person);

  return (
    <figure
      className={[
        'card',
        person.status === 'dead' && 'card--dead',
        person.unknown && 'card--unknown',
        highlighted && 'card--found',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {handles}
      <div className="card__disc" aria-hidden />
      <Portrait person={person} />
      <figcaption className="card__body">
        <div className="card__name">{person.unknown ? 'Unknown' : person.name}</div>
        {dates && <div className="card__dates">{dates}</div>}
      </figcaption>
    </figure>
  );
}

export const PersonNode = memo(PersonNodeInner);
