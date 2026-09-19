import { readFile } from 'node:fs/promises';

const family = JSON.parse(await readFile('public/data/family.json', 'utf8'));
const errors = [];
const warnings = [];

const people = new Map(family.people.map((p) => [p.id, p]));
const name = (id) => people.get(id)?.name ?? id;

// 1. duplicate ids
const dupes = (ids) => ids.filter((id, i) => ids.indexOf(id) !== i);
for (const id of new Set(dupes(family.people.map((p) => p.id))))
  errors.push(`duplicate person id: ${id}`);
for (const id of new Set(dupes(family.relationships.map((r) => r.id))))
  errors.push(`duplicate relationship id: ${id}`);

for (const r of family.relationships) {
  // 2. dangling references
  for (const end of ['from', 'to'])
    if (!people.has(r[end])) errors.push(`${r.id}: ${end} "${r[end]}" is not a person`);
  // 3. self-edge
  if (r.from === r.to) errors.push(`${r.id}: from and to are the same person`);
}

// 4. cycle in parent edges
const parentsOf = new Map();
for (const r of family.relationships)
  if (r.type === 'parent') parentsOf.set(r.to, [...(parentsOf.get(r.to) ?? []), r.from]);

const state = new Map();
const cycles = (id) => {
  if (state.get(id) === 'done') return false;
  if (state.get(id) === 'open') return true;
  state.set(id, 'open');
  for (const parent of parentsOf.get(id) ?? [])
    if (cycles(parent)) {
      errors.push(`cycle in parent edges at ${name(id)}`);
      break;
    }
  state.set(id, 'done');
  return false;
};
for (const p of family.people) cycles(p.id);

// 5. head resolves
if (!people.has(family.headId)) errors.push(`headId "${family.headId}" is not a person`);

// 6. death before birth
for (const p of family.people)
  if (p.deathYear && p.birthYear && p.deathYear < p.birthYear)
    errors.push(`${p.name}: died ${p.deathYear} before born ${p.birthYear}`);

// warnings
for (const [childId, parents] of parentsOf) {
  if (parents.length > 2) warnings.push(`${name(childId)} has ${parents.length} parents`);
  for (const parentId of parents) {
    const child = people.get(childId);
    const parent = people.get(parentId);
    if (child?.birthYear && parent?.birthYear && child.birthYear < parent.birthYear)
      warnings.push(`${child.name} born before parent ${parent.name}`);
  }
}

const linked = new Set([family.headId]);
for (let changed = true; changed; ) {
  changed = false;
  for (const r of family.relationships)
    for (const [a, b] of [
      [r.from, r.to],
      [r.to, r.from],
    ])
      if (linked.has(a) && !linked.has(b)) (linked.add(b), (changed = true));
}
for (const p of family.people)
  if (!linked.has(p.id)) warnings.push(`${p.name} is not connected to the head`);

for (const w of warnings) console.warn(`warning: ${w}`);
for (const e of errors) console.error(`error: ${e}`);
console.log(
  `${family.people.length} people, ${family.relationships.length} relationships — ` +
    `${errors.length} errors, ${warnings.length} warnings`,
);
process.exit(errors.length ? 1 : 0);
