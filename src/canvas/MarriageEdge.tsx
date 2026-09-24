import { BaseEdge, type EdgeProps } from '@xyflow/react';
import { CARD_H } from '../types';

/** Enough lift for the arc to clear the tops of the cards it passes over. */
const LIFT = CARD_H;

/**
 * Adjacent partners get a plain bar. Where another card sits between them --
 * a third wife, a remarriage -- the bar would run behind it, so the line
 * arches over the top instead.
 */
export function MarriageEdge({ sourceX, sourceY, targetX, targetY, data }: EdgeProps) {
  const span = targetX - sourceX;
  const path = data?.detour
    ? `M${sourceX},${sourceY} C${sourceX + span * 0.2},${sourceY - LIFT}` +
      ` ${targetX - span * 0.2},${targetY - LIFT} ${targetX},${targetY}`
    : `M${sourceX},${sourceY} L${targetX},${targetY}`;

  return <BaseEdge path={path} />;
}
