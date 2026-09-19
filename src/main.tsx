import { createRoot } from 'react-dom/client';
import { App } from './App';
import type { Family } from './types';
import './styles.css';

const family: Family = await fetch('/data/family.json').then((r) => r.json());

createRoot(document.getElementById('root')!).render(<App initial={family} />);
