import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';

const PAN = 120;

/** Arrows pan, + and - zoom, 0 fits. `/` and Esc belong to search. */
export function useKeyboardViewport() {
  const { getViewport, setViewport, zoomIn, zoomOut, fitView } = useReactFlow();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;

      const pan = (dx: number, dy: number) => {
        const v = getViewport();
        setViewport({ ...v, x: v.x + dx, y: v.y + dy });
      };

      switch (e.key) {
        case 'ArrowLeft': pan(PAN, 0); break;
        case 'ArrowRight': pan(-PAN, 0); break;
        case 'ArrowUp': pan(0, PAN); break;
        case 'ArrowDown': pan(0, -PAN); break;
        case '+': case '=': zoomIn(); break;
        case '-': zoomOut(); break;
        case '0': fitView({ padding: 0.15 }); break;
        default: return;
      }
      e.preventDefault();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [getViewport, setViewport, zoomIn, zoomOut, fitView]);
}
