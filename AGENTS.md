## Project Configuration

- **Language**: TypeScript
- **Package Manager**: pnpm
- **Add-ons**: prettier, eslint, tailwindcss, paraglide, mcp

---

## Project Overview

WikiTransport is a web-based schematic transit map editor. Users create metro/bus/tram-style line maps with stations, anchor points, and customizable line types. Built with Svelte 5 + SvelteKit (v2), Melt UI for interactive components, and Paraglide-JS for i18n.

---

## Architecture & Key Technical Decisions

### i18n — Paraglide-JS

**Every user-facing string MUST use `m.*()` translation calls.** Never hardcode text.

- Translation files: `messages/en.json` and `messages/fr.json`
- Import: `import * as m from '$lib/paraglide/messages.js'`
- When adding a string, ALWAYS add the key to BOTH `en.json` and `fr.json`
- Language switching via `<a data-sveltekit-reload>` links only (never `setLocale({ reload: false })`)
- For styled elements in translations (e.g. `<kbd>`), split into before/after keys so the styled element has CSS classes

### Component Architecture

- `src/lib/components/editor/` — Editor panels (LeftPanel, RightPanel, ToolBar, StationProperties, LineProperties, TypeProperties, ProjectProperties)
- `src/lib/components/schematic/` — SVG plan rendering (PlanView)
- `src/lib/components/ui/` — Reusable UI primitives (Button, Dialog, TextField, Select, Slider, IconButton, Tooltip, StationSelector, ContextMenu)
- `src/lib/store/editor.svelte.ts` — Global editor state via Svelte 5 `$state` runes
- `src/lib/services/` — Dexie.js indexedDB operations
- `src/lib/types/models.ts` — Data models
- `src/lib/constants/schematic.ts` — Rendering constants (GRID_SIZE, POINT_RADIUS, LINE_WIDTH, etc.)

### SVG Export & Preview

- `src/lib/utils/svg-export.ts` generates SVG schematics
- Preview page: `src/routes/project/[id]/[view]/export/+page.svelte`
- Rendering order: lines → stations → legend → interchange badges
- Badge shapes: circle, square, diamond, pill (diamond uses `side = radius / sqrt(2)` for visual consistency)

### Hidden Elements (Non-Global Views)

- Global view uses project-wide `hiddenLineIds` / `hiddenStationIds`
- View-specific views use `view.hiddenLineIds` / `view.hiddenStationIds`
- Anchor points must be filtered by checking `ap.lineId` against `effectiveHiddenLineIds`

### Interchange Badge System

- Two-part positioning: anchor (`station` | `label`) + direction (8-directional: N/NE/E/SE/S/SW/W/NW)
- When `badgeAnchor='label'` with E/W direction, use `getBadgeCenteringOffset()` to center label + badges as a group
- UI controls in StationProperties.svelte (anchor toggle + 3×3 direction grid, visible when `hasInterchangeBadges`)

### UI Conventions

- Tooltips: use `<Tooltip>` component, never native `title` attribute
- Icons: Material Symbols Outlined (`<span class="material-symbols-outlined">icon_name</span>`)
- Colors: CSS custom properties following Material 3 theming
- Dialogs: `<Dialog>` with `{#snippet title()}` / `{#snippet actions()}`
- Keyboard shortcuts: appended outside translation calls, e.g. `{m.cancel()} (Esc)`

### Svelte 5 Conventions

- `$state()`, `$derived()`, `$effect()` runes — no Svelte 4 stores for local state
- `$props()` with destructuring for component props
- `{#snippet}` + `{@render}` for slot patterns

---

## Critical Rules for AI Assistants

1. Translate everything — use `m.*()`, never hardcode text
2. Always update both `messages/en.json` and `messages/fr.json` when adding strings
3. Language switcher: `<a data-sveltekit-reload>` only, never `setLocale({ reload: false })`
4. Run `pnpm run check && pnpm run lint && pnpm run build` after changes; `pnpm run format` before committing
5. Check `git diff` and `git status` before making changes
6. Use `<Tooltip>` component, never native `title`
7. Follow existing patterns in neighboring files
8. No comments in code unless explicitly asked
9. In non-global views, filter anchor points by `effectiveHiddenLineIds`
10. Diamond shapes: use `side = radius / sqrt(2)` for visual consistency
11. When `badgeAnchor='label'`, compute `badgeOffsetX` and use `adjustedLayout` for both label and badges
12. For translations with styled elements, use before/after key splitting pattern
