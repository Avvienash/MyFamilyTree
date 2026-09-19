const AVATARS = [
  { disc: '#8FA0B5', letter: '#2A3543' },
  { disc: '#9DAF99', letter: '#344131' },
  { disc: '#C39B79', letter: '#4C331E' },
  { disc: '#C4AC6E', letter: '#4E3F1B' },
  { disc: '#AC94AB', letter: '#3D2D3C' },
  { disc: '#82A8A3', letter: '#263A38' },
  { disc: '#C39898', letter: '#542D2D' },
  { disc: '#91A37C', letter: '#2E3624' },
] as const;

/** Hashed on id, not name, so fixing a typo never changes someone's colour. */
export const avatar = (id: string) => {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return AVATARS[Math.abs(h) % AVATARS.length]!;
};

export const initials = (name: string) => {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '?';
  const first = [...p[0]!][0]!;
  return (p.length === 1 ? first : first + [...p.at(-1)!][0]!).toUpperCase();
};
