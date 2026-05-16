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

- `src/lib/components/editor/` — Editor panels
  - `OverviewTab.svelte`, `TypesTab.svelte`, `StationsTab.svelte` (left panel tabs)
  - `RightTabs.svelte` (right panel tab switcher)
  - `StationProperties.svelte`, `LineProperties.svelte`, `TypeProperties.svelte`, `ProjectProperties.svelte`
  - `properties/AnchorProperties.svelte` — extracted anchor editing
  - `ToolBar.svelte`, `LeftPanel.svelte`, `RightPanel.svelte`
- `src/lib/components/schematic/` — SVG plan rendering (PlanView, SchematicGrid, SchematicLines, etc.)
- `src/lib/components/ui/` — Reusable UI primitives (Button, Dialog, TextField, Select, Slider, IconButton, Tooltip, StationSelector, ContextMenu)
  - `Dialog.svelte` now accepts `icon: Snippet` prop + auto-focuses `[autofocus]` after `showModal()`
  - Dialogs: provide `{#snippet icon()}` with a colored icon + `<Button variant="filled" autofocus>` on the confirm action
- `src/lib/store/editor.svelte.ts` — Global editor state via Svelte 5 `$state` runes
  - `leftTab` type: `'overview' | 'types' | 'stations' | null` (was `'lines'`)
- `src/lib/services/` — Dexie.js indexedDB operations
- `src/lib/types/models.ts` — Data models
- `src/lib/constants/schematic.ts` — Rendering constants + `buildLineOffsets()` (shared single source of truth)
- `src/lib/utils/svg-export/badge-layout.ts` — Badge positioning logic (extracted from renderers/PlanView)

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

### Anchor Drag & Drop

- Use `dragHandleZone` + `use:dragHandle` pattern (svelte-dnd-action)
- Single dndzone with all items; only anchors get drag handles, stations are non-draggable
- Per-segment dndzones don't work because the library uses `parentNode` to exclude sibling zones from cross-zone candidates

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
13. Plan before building — for multi-step tasks, present a plan (files, order, i18n keys) before writing code. Wait for approval.

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

### Git Workflow

- Work on `dev` branch; main is protected (Netlify build triggers on push to main)
- Merge `dev` → `main` only when the user explicitly requests it
- `git checkout main && git merge dev && git push origin main`

---

## Command: `deploy`

When the user says "deploy", perform a full release cycle:

1. **Read git log** since the last release (look for the last `chore: release` commit or version tag)
2. **Summarize commits** into changelog content (in French for FR, English for EN)
3. **Create version files**:
   - `src/lib/data/changelogs/en/{version}.md` — English changelog
   - `src/lib/data/changelogs/fr/{version}.md` — French changelog
   - `CHANGELOG.md` — combined multi-lang changelog (update root file)
4. **Bump version** in `package.json` (follow semver: `major.minor.patch` or `-beta` suffix)
5. **Commit** with message `chore: release v{version}`
6. **Merge**: `git checkout main && git merge dev && git push origin main`
7. **Return to dev**: `git checkout dev`
8. **Report** the deployed version and what was shipped

### Version format

- Development builds: `{major}.{minor}.{patch}-beta` (e.g., `0.6.0-beta`, `0.7.0-beta`)
- Stable releases: `{major}.{minor}.{patch}` (drop the `-beta` suffix)

### Changelog file format (per locale)

Each version has a bilingual file pair in `src/lib/data/changelogs/{en,fr}/`:

```md
# Release Title Here

Summary: One clear, non-technical line describing what this release brings

Date: YYYY-MM-DD

- Bullet point one
- Bullet point two
```

Rules:
- `Summary:` line is shown when collapsed on the projects page (must be clear and user-friendly, no technical jargon)
- Content after `Date:` is shown when expanded (can include technical details)
- Keep titles short and meaningful
- Always create BOTH `en/{version}.md` and `fr/{version}.md` with the same structure

### CHANGELOG.md format (root)

The root `CHANGELOG.md` contains a simplified summary of each release (bilingual).

### Auto-discovery

The changelog section on the projects page automatically picks up new versions via `import.meta.glob` in `src/lib/data/changelogs/index.ts` — no manual registration needed.
