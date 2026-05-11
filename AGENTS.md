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

---

## Refactoring — Code Organization & Architecture

### Command: `refactorise`

The `refactorise` command triggers a full-codebase restructuring pass. It means:

1. **SRP (Single Responsibility)**: Every file does one thing. Split large files (over ~300 lines) into focused modules.
2. **DRY (Don't Repeat Yourself)**: Extract repeated patterns into services or utility functions.
3. **Separation of Concerns**: Domain logic in services, state in stores, rendering in components, types in dedicated files.
4. **Clean Architecture**: Clear dependency direction — Components → Services/Store → Utils/Types.

### Code Organization

```
src/lib/
├── types/               # All TypeScript interfaces & types (one file per domain)
│   ├── index.ts         # Barrel re-export
│   ├── project.ts
│   ├── transit-type.ts
│   ├── line.ts
│   ├── station.ts
│   ├── route-point.ts
│   ├── anchor-point.ts
│   ├── view.ts          # View, ViewStation
│   └── interchange.ts   # InterchangeBadgeMode, InterchangeBadgeDirection, IconShape
├── store/               # Svelte 5 $state runes (state only, no business logic)
│   └── editor.svelte.ts
├── services/            # Database CRUD + orchestration (thin, single-responsibility)
│   ├── Database.ts
│   ├── project.service.ts
│   ├── transit-type.service.ts
│   ├── line.service.ts
│   ├── station.service.ts
│   ├── anchor-point.service.ts
│   ├── view.service.ts
│   ├── view-station.service.ts
│   └── editor.service.ts
├── utils/               # Pure functions, no side effects
│   ├── color.ts
│   ├── geometry.ts
│   ├── text-measure.ts
│   └── svg-export/      # SVG rendering (split by concern)
│       ├── index.ts
│       ├── bounds.ts
│       ├── renderers.ts
│       └── legend.ts
├── components/          # Svelte 5 components
│   ├── editor/
│   │   ├── properties/  # Sub-components for properties panels
│   │   │   ├── DirectionGrid.svelte
│   │   │   ├── AnchorGrid.svelte
│   │   │   ├── InterchangeBadgeControls.svelte
│   │   │   └── ServingLinesList.svelte
│   │   ├── LeftPanel.svelte
│   │   ├── RightPanel.svelte
│   │   ├── StationProperties.svelte
│   │   ├── LineProperties.svelte
│   │   ├── ProjectProperties.svelte
│   │   ├── TypeProperties.svelte
│   │   └── ToolBar.svelte
│   ├── schematic/
│   │   ├── PlanView.svelte
│   │   ├── SchematicGrid.svelte
│   │   ├── SchematicLines.svelte
│   │   ├── SchematicStations.svelte
│   │   ├── SchematicAnchors.svelte
│   │   └── SchematicBadges.svelte
│   └── ui/
└── constants/
    └── schematic.ts
```

### Key Principles

- **No file > ~400 lines**: Split into sub-modules if growing beyond.
- **Types first**: All interfaces in `src/lib/types/`, never inline type definitions.
- **Services are thin**: Just CRUD wrappers and orchestration. No rendering logic.
- **Components are Dumb**: Read from store, emit events/call services. No direct DB access.
- **Utils are Pure**: No Svelte imports, no side effects, fully testable.
- **Shared logic lives once**: E.g., `buildLineOffsets` lives in a shared utility, not duplicated in both PlanView and svg-export.

### Badge Layout Duplication

The `getBadgeLayout` function is defined identically in both `PlanView.svelte` and `svg-export.ts`. When refactoring, extract to a shared utility — the canonical location is in `src/lib/utils/svg-export/` (since SVG export rendering is more complex), imported by PlanView. This is the single source of truth for badge positioning.
