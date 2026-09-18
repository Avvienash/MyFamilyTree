# Family Tree — Design & Technical Specification

**v3.0 · September 2026 · Ready to build**

A public family tree, maintained by one administrator through a local visual editor. The application does not model kinship. It renders the relationships the administrator records, and lets them be arranged by hand.

**In scope.** Infinite canvas, pan and zoom. Person cards. Marriage and parent edges. Unknown-ancestor placeholders. Manual positioning, automatic tidy on request. Search. Level-of-detail rendering.

**Out of scope.** Profile pages, biographies, places, sources, comments, multiple contributors, public editing, privacy controls, GEDCOM, dark mode, any relationship type beyond marriage and parent.

---

## 1. Data model

```ts
type Person = {
  id: string;                          // "p001"
  name: string;
  gender?: 'male' | 'female';          // partner ordering only, never rendered
  unknown?: true;                      // placeholder ancestor
  position?: { x: number; y: number }; // absent until placed
} & (
  | { status: 'alive'; birthYear?: number }
  | { status: 'dead'; birthYear?: number; deathYear?: number }
);

type Relationship = {
  id: string;
  from: string;
  to: string;
  type: 'marriage' | 'parent';         // parent: from is the parent of to
};

type Family = {
  familyName: string;
  headId: string;                      // the apex
  people: Person[];
  relationships: Relationship[];
};
```

That is the whole model. The `status` union makes `deathYear` on a living person unrepresentable rather than validated.

No `photo` field: the portrait is `public/photos/{id}.webp`, and a missing file falls back to initials via `onError`. Photo presence is a filesystem fact, not state to keep in sync.

`position` is optional. A person has no position until placed, which is what makes the layout engine an assistant rather than an authority.

### Unions are derived

```
parents(child) = { p : relationship(p → child, 'parent') }
```

Children with an identical parent set form one union. Recomputed on load, never stored, so it cannot fall out of sync. One condition: **when both parents are known, record both.** A child with one recorded parent cannot be assigned to a marriage — when the second parent is unknown, that is what an unknown node is for.

---

## 2. Visual design

### Palette

```css
--ground:     #E8EAE6;   /* canvas */
--card:       #FAFAF8;   /* card surface */
--ink:        #2E3A36;   /* names */
--ink-muted:  #5F776F;   /* dates, deceased text, unknown */
--line:       #7C8981;   /* borders, connectors */
--disc-blank: #B4BCB6;   /* unknown-node disc */
```

`--ink` is a dark desaturated green, not a tinted black, so the screen holds one temperature. The ground is a cool gallery grey, deliberately not cream — warm paper plus a serif is the reflexive heritage look.

| Pair | Ratio | Requires |
|---|---|---|
| ink on card | 11.32 : 1 | 4.5 |
| ink on ground | 9.77 : 1 | 4.5 |
| ink-muted on card | 4.61 : 1 | 4.5 |
| line on ground | 3.01 : 1 | 3.0 |
| line on card | 3.49 : 1 | 3.0 |

Connectors carry meaning, so WCAG 1.4.11 applies to them at 3:1.

### Initials avatars

Eight curated tones, indexed by hashing the **id** — not the name, so fixing a typo never changes someone's colour. Every pair clears 4.5:1. These discs are the only colour the interface creates; everything else is grey, ink, or a photograph.

| Disc | Letter | | Disc | Letter |
|---|---|---|---|---|
| `#8FA0B5` | `#2A3543` | | `#82A8A3` | `#263A38` |
| `#9DAF99` | `#344131` | | `#C39898` | `#542D2D` |
| `#C39B79` | `#4C331E` | | `#91A37C` | `#2E3624` |
| `#C4AC6E` | `#4E3F1B` | | `#AC94AB` | `#3D2D3C` |

```ts
export const avatar = (id: string) => {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return AVATARS[Math.abs(h) % AVATARS.length];
};

export const initials = (name: string) => {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '?';
  const first = [...p[0]][0];
  return (p.length === 1 ? first : first + [...p.at(-1)!][0]).toUpperCase();
};
```

Spread to an array before indexing so names outside the BMP are not sliced mid-character.

### Typography

**Source Serif 4, static 400**, subsetted and self-hosted as one woff2 (~25KB), preloaded, `font-display: swap`. One family, one weight, nothing else.

Not the variable font: `font-optical-sizing` responds to computed font-size, and the canvas is scaled by a CSS transform, so the browser always sees 15px regardless of zoom.

| Role | Size | Colour |
|---|---|---|
| Family name, fixed top-left | 20px | `--ink` |
| Person name | 15px / 1.25 | `--ink` |
| Dates | 12px | `--ink-muted` |
| UI — search, buttons, panel | 14px | `--ink` |

Sentence case throughout. Never uppercase.

### The card

140 × 160px, `--card`, 1px `--line`, 12px radius, **no shadow**. Circular 64px portrait — it crops faces acceptably at any source aspect ratio and makes the initials fallback dimensionally identical to a photo.

```
 ╭──────────────╮        ╭ ─ ─ ─ ─ ─ ─ ╮
 │    ╭─────╮   │        │    ╭────╮   │
 │    │photo│   │        │    │ ?  │   │   disc --disc-blank
 │    ╰─────╯   │        │    ╰────╯   │
 │  John Smith  │        │   Unknown   │   italic, --ink-muted
 │   1972–2025  │        ╰ ─ ─ ─ ─ ─ ─ ╯   1px dashed --line
 ╰──────────────╯
```

**Date line.** alive + birthYear → `2004–`; dead + both → `1972–2025`; dead + birth only → `1972–?`; dead + death only → `?–2025`; otherwise omitted. The trailing en dash is the genealogical convention and avoids a redundant "b." prefix.

**Deceased.** `filter: grayscale(1)`, portrait at 90% opacity, text in `--ink-muted`, border unchanged. No crosses, no separate colour. This will be most of the upper tree — check it against thirty real photographs, and reduce to `grayscale(0.7)` if it reads drab rather than quiet.

**Unknown.** Ordinary records with `unknown: true`. Special-cased in exactly two places: the dashed treatment above, and exclusion from search.

### Motion

One orchestrated moment on load, nothing else. Open centred on the head at `near` scale, hold 600ms, `fitView` over 1.5s. Any input cancels it and jumps to the end state. `prefers-reduced-motion` skips it.

No hover transitions, no staggered entrances. Motion that answers an action stays: the canvas eases to a search result over 500ms.

---

## 3. Canvas

React Flow (`@xyflow/react`) provides the viewport, pinch-zoom, dragging, selection and virtualisation. It is the only runtime dependency. The public and admin builds share one renderer with interaction switched off, so the public view cannot drift from what was arranged.

```tsx
<ReactFlow
  nodesDraggable={admin}
  elementsSelectable={admin}
  nodesConnectable={false}
  onlyRenderVisibleElements
  panOnDrag zoomOnScroll
  minZoom={0.15} maxZoom={2.5}
  proOptions={{ hideAttribution: true }}
/>
```

React Flow is MIT and hiding the attribution is explicitly permitted for non-commercial use.

### Connectors

Each union becomes a **derived node**: zero-size, non-draggable, non-selectable, never persisted, positioned at the midpoint of its parents, one card-height plus 45px below them.

| Line | Edge |
|---|---|
| Marriage bar | `straight`, spouse → spouse |
| Stem, sibling bar, child drops | `smoothstep`, union node → each child |

`smoothstep` splits at the midpoint of the vertical gap, so children on the same row share one horizontal run — the sibling bar emerges from the built-in edge. There is no custom edge component and no hand-drawn SVG layer.

1.5px `--line`, `borderRadius: 8`, no arrowheads — family flows downward and saying so twice is redundant. Every path needs `vector-effect: non-scaling-stroke`, or at `minZoom` a 1.5px stroke renders at 0.22px.

```
        (A)───────(B)        marriage bar
             │
             │               stem
        ┌────┴────┐          sibling bar
       (C)       (D)         child drops
```

A single known parent starts the stem at that person. One child skips the bar.

### Zoom levels

A class on the wrapper, set from the current scale. Changing one class on a parent is free; re-rendering hundreds of components per wheel tick is not.

| Level | Scale | Shows |
|---|---|---|
| `far` | < 0.5 | 16px disc, no image request |
| `near` | ≥ 0.5 | card, portrait, name, dates |

Card geometry is identical at both levels — only the contents change — so nothing reflows.

---

## 4. Layout

**The layout engine is an assistant, not the authority.**

**Placing a new person is a local heuristic, never a re-layout.** A child goes beneath the midpoint of its parents, offset right of the last-placed sibling. A spouse goes beside their partner. An unattached person lands at the viewport centre. Nothing already arranged is disturbed.

**Tidy runs only on request**, from an admin button that warns first because it discards every manual position. Expect to use it once, early.

**No layout library.** A family tree is not a general DAG, and ~80 lines beat 500KB of transpiled Java:

1. **Generation** — longest parent-chain depth in topological order; head at 0. `y = generation × 250`.
2. **Order** — DFS from the head through unions. Spouses stay adjacent, male left where both genders are known. Children sort by birth year.
3. **x** — pack each generation left to right at 40px gaps, then one bottom-up pass centring each parent pair over its children's span and one top-down pass centring children under their parents, shifting subtrees right to resolve overlap.
4. **Anchor** — translate the graph so the head sits at `x = 0`. He stays centred and at the top permanently, and the opening animation has a subject.

Tidy lives in `src/admin/` and never reaches the public bundle, which reads saved positions and computes nothing.

---

## 5. Search

One input, bottom-left, `--card`, placeholder `Find someone`. Diacritic-insensitive (`normalize('NFD')`), token-based AND matching — `ahmad ismail` finds `Ahmad bin Ismail`, which substring matching misses. Results show name and dates, because two relatives called John Smith are otherwise indistinguishable. Unknown nodes excluded.

Selecting a result eases the canvas to centre that person at scale 1.2 and draws a 2px `--ink` ring that fades after 2s.

---

## 6. Admin runs locally

A browser admin that writes `family.json` needs repository write access, and there are only two routes: a token in the client bundle, which anyone can read off a public repo, or a serverless function, which is a backend with a secret to rotate and rules out GitHub Pages. A password gate is checked in code the visitor already downloaded. So the editor is not on the internet.

```
npm run dev      → Vite on localhost:5173, admin enabled
npm run build    → public bundle, admin tree-shaken out
git push         → Actions deploys
```

No token, no password, no backend. The published site contains no editing code — absent, not hidden. The cost is that editing requires a checkout, which for one administrator is not a constraint.

**Why a flat file and not a database.** One writer, 300 records, 55 KB — less than a single photograph. Git already supplies what a database would have to be configured to supply: versioned history, backups that cannot silently stop running, diffs readable per relative, and deploys where data and code ship atomically, so the site can never serve a bundle that disagrees with its data. A database also needs a connection string, which needs a server to hold it, which is the backend this section exists to avoid. Revisit only if there is ever a second editor.

Saving is a `POST /api/save` handled by a ~30-line Vite plugin; photo upload is the same plugin writing to `photos-src/`. Vite 8's plugin API is Rollup-compatible, so this is unchanged from v7.

```ts
// vite-plugin-admin.ts
export function adminApi(): Plugin {
  return {
    name: 'admin-api',
    apply: 'serve',                    // cannot be built
    configureServer(server) {
      server.middlewares.use('/api/save', async (req, res) => {
        await fs.writeFile('public/data/family.json',
          JSON.stringify(await readBody(req), null, 2));
        res.end('{"ok":true}');
      });
    },
  };
}
```

Admin code sits behind a single `import.meta.env.DEV` boundary so Rolldown drops the subtree.

### Editing surface

```
┌────────────────────────────────────────────┐   ┌─────────────────────────┐
│ Keluarga Yusof            Admin · Unsaved  │   │ Edit person             │
│ + Person   + Relationship   Tidy   Save    │   │ Photo      [ Upload ]   │
└────────────────────────────────────────────┘   │ Name       [          ] │
                                                 │ Gender     [ Female ▾ ] │
                                                 │ Status     [ Alive  ▾ ] │
                                                 │ Born       [ 2004     ] │
                                                 │ Died       [          ] │  disabled while alive
                                                 │ [ Delete ]     [ Done ] │
                                                 └─────────────────────────┘
```

`Save` is explicit. Dragging marks the document dirty; a `beforeunload` guard catches an unsaved close. The edit panel docks right rather than sitting over the canvas — you need to see the tree while editing it.

**Adding a relationship.** Click `+ Relationship`, then two nodes in order; a menu at the second offers `Marriage` or `Parent → child`. The first node clicked is the parent. A ghost edge is drawn while the menu is open, so direction is never ambiguous.

**Deleting a person** must cascade to every relationship referencing them, and the confirmation says so:

```
Delete John Smith?
This also removes 4 relationships:
  marriage to Mary Chen · parent of Michael Smith
  parent of Sarah Smith · child of Ahmad bin Yusof
[ Cancel ]  [ Delete ]
```

---

## 7. Storage and photos

```
public/data/family.json   people, relationships, positions — one file
public/photos/            {id}.webp, committed
photos-src/               originals, gitignored
```

The data file lives under `public/` because Vite copies that directory verbatim into `dist/` and touches nothing else. A file at the repository root is never published, so `fetch('/data/family.json')` would 404 in production while working fine in dev. Add it to `server.watch.ignored` so saving does not trigger a full reload.

`npm run photos` runs `sharp` over `photos-src/`, emitting one **256px** square centre crop per person at quality 80, **EXIF stripped** — roughly 9KB each, covering a 64px portrait at 3× DPR. One size, so there is no srcset and no level-of-detail image switching. It prints a count of people without a photo.

Only derived files are committed. Git keeps every version of every binary forever, so committing 6MB phone photos inflates the repository permanently.

---

## 8. Validation

`scripts/validate.mjs` plus `tsc --noEmit`, run in CI. Any error fails the deploy. There is no linter, no formatter and no test framework — this is the whole quality-control system.

**Errors.** Duplicate ids · `from` or `to` referencing a missing person · `from === to` · a cycle in parent edges · `headId` not resolving to exactly one person · `deathYear < birthYear`.

**Warnings** (printed with counts, do not fail). More than two parents · a child born before a parent · a person not connected to the head.

Everything else the previous draft checked is either impossible in the type, impossible in the UI, or cosmetic.

---

## 9. Architecture

```
family-tree/
├─ .github/workflows/deploy.yml
├─ photos-src/                  (gitignored)
├─ public/                      copied verbatim into dist/
│  ├─ data/family.json
│  ├─ photos/
│  └─ fonts/source-serif-4.woff2
├─ scripts/{validate.mjs, build-photos.mjs}
├─ src/
│  ├─ canvas/{Tree.tsx, PersonNode.tsx, UnionNode.tsx,
│  │          deriveUnions.ts, useDetailLevel.ts}
│  ├─ admin/{Toolbar.tsx, EditPanel.tsx, placement.ts, tidy.ts}
│  ├─ lib/{avatar.ts, search.ts}
│  └─ types.ts · styles.css · main.tsx
├─ vite-plugin-admin.ts · vite.config.ts · package.json
```

| | |
|---|---|
| Build | Vite 8 (Rolldown) + React 19.3 + TypeScript |
| Canvas | `@xyflow/react` 12 |
| Layout | own, ~80 lines, admin only |
| Styling | plain CSS with custom properties, ~200 lines |
| Images | `sharp`, build-time only |
| Host | GitHub Pages via Actions |

No Tailwind: the styling surface is a canvas, a card, a panel and a search box. A build step, a config file and a utility vocabulary do not earn their place against six custom properties. No Next.js and no Vercel: there is no server to render on.

---

## 10. Performance

| | Budget |
|---|---|
| Public JS, gzipped | < 120 KB (React ~45 + React Flow ~50 + app) |
| `family.json`, 300 people | ≈ 55 KB, fetched separately so it caches apart from the bundle |
| First contentful paint, 4G | < 1.5 s |
| Pan at 300 nodes | 60 fps |
| Page weight at `far` | < 200 KB |

Worst case is `far`, where the whole tree is on screen and `onlyRenderVisibleElements` culls nothing — but nodes there are 16px discs with no image and no text. Re-measure past 800 people; that is the point at which the DOM may need to become a canvas.

---

## 11. Accessibility

- Public cards are `<figure>`, not buttons. A button that does nothing is worse than no button.
- The keyboard and assistive route is a flat list view grouped by generation, toggled top-right. It also works when the canvas fails, and it is what a search engine reads.
- `alt` on every portrait is the person's name; initials discs carry `aria-label`.
- Deceased status is carried textually by the date line, not only by desaturation, so the years must not be omitted when known.
- `prefers-reduced-motion` honoured for the load sequence and the search jump.
- Keys: `/` search, `Esc` clear, arrows pan, `+` `-` zoom, `0` fit.

---

## 12. Deployment

```yaml
name: Deploy
on: { push: { branches: [main] } }
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: false }

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v5
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: node scripts/validate.mjs
      - run: npm run build
      - uses: actions/upload-pages-artifact@v5
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: github-pages
    steps: [{ uses: actions/deploy-pages@v5 }]
```

`cancel-in-progress: false` — cancelling a Pages deploy mid-flight can leave it stuck. `upload-pages-artifact` and `deploy-pages` must both be v5; earlier majors run on the retired Node 20 runtime.

Set the repository's Pages source to **GitHub Actions**, not a branch.

### Custom domain

- Apex `example.com` → GitHub's four documented A records, or an ALIAS/ANAME at a provider that supports it. `www` → `CNAME` to `<user>.github.io`.
- Enter the domain in repo Settings → Pages. **Do not add a `CNAME` file**: a custom Actions workflow neither creates nor reads one, and the repo setting is the single source of truth. The "custom domain keeps disappearing" problem belongs to branch-based deploys.
- Tick **Enforce HTTPS** once the Let's Encrypt certificate provisions, which can take up to 24 hours and will stay unavailable while DNS is still propagating.
- `base: '/'` — Vite's default. A custom domain serves from the root, so no base path rewriting.

### Limits

Published site ≤ 1 GB, ~100 GB/month bandwidth, both soft. This project is around 5 MB at 300 people. The 10-builds-per-hour cap does not apply to custom Actions workflows.

Free Pages serves only from public repositories, so the tree and its photographs are public — which is the premise. If the repo ever has to be private, move to Cloudflare Pages rather than upgrading; same workflow, still free.

---

## 13. Build order

| | |
|---|---|
| 1 | Types, `family.json` with 20 hand-typed people, `deriveUnions` |
| 2 | React Flow canvas, PersonNode, pan and zoom, positions from file |
| 3 | Card — portrait, initials, dates, deceased, unknown |
| 4 | Union nodes and connectors, `non-scaling-stroke` |
| 5 | Zoom levels and virtualisation |
| 6 | Admin: Vite plugin, save, edit panel, drag-and-persist |
| 7 | Admin: add person, add relationship, delete with cascade |
| 8 | Placement heuristic, then tidy |
| 9 | Search, list view, validation |
| 10 | Actions workflow, photo pipeline, custom domain, load animation |

Steps 1–4 run against hand-typed data before any editing UI exists. The card and the connectors are what you will look at for years; the editor is a tool you use for an hour a month.
