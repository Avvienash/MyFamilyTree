import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Node } from '@xyflow/react';

export type UnionNodeType = Node<Record<string, never>, 'union'>;

/** Zero-size, derived, never persisted. It only anchors the connectors. */
function UnionNodeInner() {
  return (
    <div className="union">
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </div>
  );
}

export const UnionNode = memo(UnionNodeInner);
