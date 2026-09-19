import { useStore } from '@xyflow/react';

/**
 * One class on the wrapper. Changing a class on a parent is free;
 * re-rendering hundreds of components per wheel tick is not.
 */
export const useDetailLevel = () => useStore((s) => (s.transform[2] < 0.5 ? 'far' : 'near'));
