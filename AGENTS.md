## Project Configuration

- **Language**: TypeScript
- **Package Manager**: pnpm
- **Add-ons**: prettier, eslint, tailwindcss, paraglide, mcp

---

## Project Overview

WikiTransport is a web-based schematic transit map editor. Users create metro/bus/tram-style line maps with stations, anchor points, and customizable line types. It uses Svelte 5 with SvelteKit (v2) and Melt UI for interactive components, and Paraglide-JS for internationalization (i18n).

---

## Architecture & Key Technical Decisions

### Internationalization (i18n) — Paraglide-JS

**Every user-facing string MUST use `m.*()` translation calls.** Hardcoded strings in French or English are not acceptable.

- Translation files: `messages/en.json` and `messages/fr.json`
- Import: `import * as m from '$lib/paraglide/messages.js'`
- Use in templates: `{m.key_name()}`
- Use in script: `m.key_name({param: value})` for parameterized messages
- When adding a new user-facing string, ALWAYS add the key to BOTH `en.json` and `fr.json`

**Language switching is done via `<a>` links with `data-sveltekit-reload`:**

```svelte
<a
  href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}
  data-sveltekit-reload
  ...
>{locale}</a>
```

- `data-sveltekit-reload` forces a full page reload so the server hook detects the new locale from the URL.
- The active locale is determined by `page.url.pathname.includes(...)`.
- Do NOT use `<button>` + `setLocale({ reload: false })` — it breaks server-side locale detection.
- The i18n strategy is `['url', 'cookie', 'baseLocale']` (configured in `vite.config.ts`).
- `src/hooks.ts` exports a `reroute` function that delocalizes URLs for SvelteKit routing.
- `src/hooks.server.ts` uses `paraglideMiddleware` directly (no manual cookie injection).

**Styled elements in translations (key splitting pattern):**

When a translation contains styled elements like `<kbd>` tags, split the message into before/after keys:

```json
// en.json
{
	"too_far_before_key": "You're too far. Press ",
	"key_space": "Space",
	"too_far_after_key": " to recenter."
}
```

```svelte
<!-- Usage in template -->
<span>
	{m.too_far_before_key()}
	<kbd class="...">{m.key_space()}</kbd>
	{m.too_far_after_key()}
</span>
```

This allows the styled element (like a keyboard key) to have proper CSS classes while keeping text translatable.

### Component Architecture

- `src/lib/components/editor/` — Editor panels (LeftPanel, RightPanel, ToolBar, StationProperties, LineProperties, TypeProperties, ProjectProperties)
- `src/lib/components/schematic/` — SVG plan rendering (PlanView)
- `src/lib/components/ui/` — Reusable UI primitives (Button, Dialog, TextField, Select, Slider, IconButton, Tooltip, StationSelector, ContextMenu, etc.)

### Data Flow

- Global editor state is managed in `src/lib/store/editor.svelte.ts` via Svelte 5 `$state` runes.
- Services (`src/lib/services/`) wrap Dexie.js indexedDB operations.
- Data models are defined in `src/lib/types/models.ts`.

### Constants

- `src/lib/constants/schematic.ts` contains key rendering constants:
  - `GRID_SIZE = 40` — editor grid cell size
  - `POINT_RADIUS = 8` — station circle radius
  - `LINE_WIDTH = 6` — line stroke width
  - `LINE_SPACING = 12` — parallel line offset
  - `ANCHOR_DX_DEFAULT = 14` / `ANCHOR_DY_DEFAULT = 14` — default label offset from anchor
  - `DIR_CFG`, `DIR_ARROWS`, `ANCHOR_ICONS` — direction-specific rendering config
  - `DASH_PATTERNS` — available line dash patterns (solid, dashed_short, dashed_long, dotted, dash_dot)

### Interchange Badge System

**Two-part positioning model:**

- **Anchor**: Reference point for badge placement
  - `'station'`: Badges positioned relative to the station circle
  - `'label'`: Badges positioned relative to the label text anchor

- **Direction**: 8-directional positioning from anchor
  - `'N'`, `'NE'`, `'E'`, `'SE'`, `'S'`, `'SW'`, `'W'`, `'NW'`

**Data models (`src/lib/types/models.ts`):**

```typescript
export type InterchangeBadgeAnchor = 'station' | 'label';
export type InterchangeBadgeDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export interface ViewStation {
	interchangeBadgeAnchor?: InterchangeBadgeAnchor; // default: 'station'
	interchangeBadgeDirection?: InterchangeBadgeDirection; // default: 'S'
	hiddenInterchangeLineIds?: number[]; // lines to exclude from badge display
}
```

**UI Controls (`StationProperties.svelte`):**

- Button group for anchor selection (station/label icons)
- 3×3 grid for 8-directional positioning (center disabled as it's ambiguous)
- Only visible when `hasInterchangeBadges` is true (station has hidden serving lines)

**Getters (`editor.svelte.ts`):**

```typescript
stationInterchangeBadgeAnchor(station: Station): InterchangeBadgeAnchor
stationInterchangeBadgeDirection(station: Station): InterchangeBadgeDirection
stationHiddenInterchangeLineIds(station: Station): number[]
```

**Service methods (`ViewStationService.ts`):**

```typescript
setInterchangeBadgeAnchor(viewId: number, stationId: number, anchor: InterchangeBadgeAnchor)
setInterchangeBadgeDirection(viewId: number, stationId: number, direction: InterchangeBadgeDirection)
```

### Label Centering with Interchange Badges

**The problem:** When `badgeAnchor='label'` and badges are placed to the E (right) or W (left), the label and badges should be centered as a group on the original label anchor point.

**The solution: `getBadgeCenteringOffset()` helper function**

This function calculates how much to shift the label to center the combined group:

| Direction | Offset Calculation             | Effect                        |
| --------- | ------------------------------ | ----------------------------- |
| E (right) | `-(gap + badgeSize) / 2`       | Shift label LEFT by ~20px     |
| W (left)  | `+(gap + badgeSize) / 2`       | Shift label RIGHT by ~20px    |
| NE/SE     | `-(gap/2 + badgesWidth/2) / 2` | Small left shift              |
| NW/SW     | `+(gap/2 + badgesWidth/2) / 2` | Small right shift             |
| N/S       | `0`                            | Already centered horizontally |

**Implementation pattern:**

1. Compute `badgeOffsetX = getBadgeCenteringOffset(anchor, direction, badgeCount)`
2. Create `adjustedLayout = { x: layout.x + badgeOffsetX, y: layout.y, subtitleY: layout.subtitleY }`
3. Use `adjustedLayout` for both label rendering AND badge layout
4. In `getStationLabelExtent`, also shift text bounds by `badgeOffsetX`

**Files implementing this:**

- `PlanView.svelte` (editor view)
- `svg-export.ts` (export/preview)

### Badge Shapes & Visual Consistency

**Shape types:** `circle`, `square`, `diamond`, `pill` (defined by `TransitType.iconShape`)

**Diamond shape fix:**

A diamond rotated 45° has vertices further from the center than its side length. To make it visually match circles/squares:

```typescript
const BADGE_HALF = BADGE_SIZE / 2; // 10px for 20px badge
const DIAMOND_HALF = BADGE_HALF / Math.SQRT2; // ~7.07px
const DIAMOND_SIZE = DIAMOND_HALF * 2; // ~14.14px
```

This ensures the rotated diamond's vertices are at the same distance from center as the circle's radius.

**Constants:**

- `BADGE_SIZE = 20`
- `BADGE_HALF = 10`
- `BADGE_GAP = 3` (between badges)
- `BADGE_GAP_FROM_ANCHOR = 20` (gap between anchor and badges)

### Hidden Elements in Non-Global Views

**Global view vs View-specific:**

- `isGlobalView = true`: Uses project-wide `hiddenLineIds` and `hiddenStationIds`
- `isGlobalView = false`: Uses view-specific `view.hiddenLineIds` and `view.hiddenStationIds`

**Effective hidden sets (`editor.svelte.ts`):**

```typescript
get effectiveHiddenLineIds(): Set<number> {
  if (this.isGlobalView) return this.hiddenLineIds;
  return new Set(view?.hiddenLineIds ?? []);
}

get effectiveHiddenStationIds(): Set<number> {
  if (this.isGlobalView) return this.hiddenStationIds;
  // Also includes stations only served by hidden lines
}
```

**Elements filtered in non-global views:**

1. **Stations**: Already filtered via `effectiveHiddenStationIds`
2. **Lines**: Filtered via `effectiveHiddenLineIds`
3. **Anchor points**: MUST be filtered by checking if `ap.lineId` is in `effectiveHiddenLineIds`
4. **Content bounds**: All of the above contribute to bounds calculation

**Anchor filtering pattern (`PlanView.svelte`):**

```svelte
{#each editorState.anchorPoints as ap}
	{@const isHiddenAnchor =
		!editorState.isGlobalView && editorState.effectiveHiddenLineIds.has(ap.lineId)}
	{#if !isHiddenAnchor}
		<!-- render anchor -->
	{/if}
{/each}
```

**In `allContentPoints`:**

```typescript
for (const a of editorState.anchorPoints) {
	if (!editorState.isGlobalView && editorState.effectiveHiddenLineIds.has(a.lineId)) continue;
	points.push({ x: a.schematicX, y: a.schematicY });
}
```

**Note:** `svg-export.ts` already handles this correctly because it receives `data.hiddenLineIds` which is the effective set for the current view context.

### UI Conventions

- **Tooltips**: always use the `<Tooltip>` component (not the native `title` attribute). Import from `$lib/components/ui`.
- **Icons**: Material Symbols Outlined (`<span class="material-symbols-outlined">icon_name</span>`).
- **Colors**: Use CSS custom properties (`--color-surface`, `--color-primary`, etc.) following Material 3 theming.
- **Dialogs**: Use the `<Dialog>` component with `{#snippet title()}`, `{#snippet actions()}`.
- **Keyboard shortcuts**: Appended outside translation calls, e.g. `{m.cancel()} (Esc)`.

### SVG Export / Preview Rendering

- **`src/lib/utils/svg-export.ts`** generates SVG schematics via `generateExportSvg()` (download) and `buildExportSvgForPreview()` (inline preview).
- **Preview page**: `src/routes/project/[id]/[view]/export/+page.svelte`

**Rendering order** (back-to-front):

1. `<g id="lines">` — octilinear paths for each line (with parallel offsets)
2. `<g id="stations">` — station circles + text labels (with subtitle)
3. `<g id="legend">` — right-column legend (if `showLegend`)
4. `<g id="interchanges">` — hidden-line / interchange badges (on top)

**Content bounds** (`getContentBounds`):

- Collects all station positions (filtering hidden stations) and anchor points (filtering hidden lines)
- For each station, calls `getStationLabelExtent` to compute the label bounding box, which:
  - Uses `measureText()` from `@chenglou/pretext` (falls back to `name.length * fontSize * 0.58`)
  - Accounts for subtitle bounds
  - For rotated labels (NE/NW/SE/SW), computes the rotated bounding box via `cos`/`sin` of the angle
  - If the station has hidden-line badges, adds their bounding box (using `getBadgeLayout`)
  - When `badgeAnchor='label'` with horizontal offset, shifts text bounds by `badgeOffsetX`
- Adds 60px padding around content

**Station labels** (`renderStationLabel`):

- Label position computed via `getLabelLayout()` using `labelAnchor` + `anchorDx`/`anchorDy` offsets
- When `badgeAnchor='label'`, applies `badgeOffsetX` to create `adjustedLayout`
- Title font: 12px (no subtitle) or 11px (with subtitle), bold
- Subtitle font: 9px, regular, positioned at `layout.subtitleY`
- `text-anchor` is always `"start"` — alignment is done via manual `titleX` offset:
  - `start` anchor (E/NE/SE): `titleX = layout.x`
  - `end` anchor (W/NW/SW): `titleX = layout.x - titleW`
  - `middle` anchor (N/S): `titleX = layout.x - titleW / 2`
- Rotation via `<g transform>` for diagonal directions

**Hidden-line / interchange badges**:

- **Positioning**: Uses `getBadgeLayout(anchor, direction, ...)` which returns `{ startX, startY, horizontal }`
- **Layout rules**:
  - Horizontal directions (N/S/NE/NW/SE/SW): badges arranged horizontally, centered on anchor's X
  - Vertical directions (E/W): badges stacked vertically, centered on anchor's Y
  - Gap from anchor: 20px (`BADGE_GAP_FROM_ANCHOR`)
  - Gap between badges: 3px (`BADGE_GAP`)
- **S-label special case**: When `anchor='station'` and `stationLabelDir` contains 'S' (label is below station), badges go ABOVE station instead of below
- **SVG export** (`renderInterchanges`): renders 20×20 colored shape badges
- **Editor view** (`PlanView.svelte`): same badges, uses inline `<circle>`/`<rect>`/`<polygon>`

**Badge shapes** (`shapeSvg`):

- `circle`, `square`, `diamond`, `pill` — defined by `TransitType.iconShape`
- Diamond: rotated rect with `side = radius / sqrt(2)` for visual consistency
- Diamond uses smaller font (7px vs 10px for others)
- Text centered inside shape at `cy + fontSize * 0.35` (0.3 for diamond)
- White stroke (`1.5px`) around all shapes

**Line offsets** (`buildLineOffsets`):

- Computes parallel spacing for overlapping line segments
- Uses `LINE_SPACING` (12px) between parallel lines
- Lines sorted by transit type ID, then line ID

**Legend** (`renderLegend`):

- Full-height right column with 20px gap from map bounds
- Each line entry: 30×30 badge (with line name) + 2-line terminus text (`13px`)
- Below the termini, optional 18×18 interchange badges of other lines that share stations with this line (max 4, via `computeLineInterchanges`)
- No title header; entry height 40px (58px with interchanges)
- Background: `#f4f4f4` rect

**Legend dimensions** (`getLegendDimensions`):

- Width based on max terminus name length + optional interchange badge row width
- Minimum 200px

**Progress animation** (preview page):

- Uses `requestAnimationFrame` with an easing curve to 88% over 4 seconds
- SVG computation deferred via `setTimeout(80ms)` so the browser paints the progress overlay first
- `generationCounter` kept as plain `let` (not `$state`) to avoid infinite effect re-runs
- `CircularProgress` switches to determinate mode when `value > 0`
- Cleanup of pending `rAF`/`timeout` on effect re-run and `onDestroy`

- Use `$state()`, `$derived()`, `$effect()` runes — no Svelte 4 stores for local state.
- Use `$props()` for component props with destructuring.
- Use `{#snippet}` and `{@render}` for slot patterns.

---

## Available Svelte MCP Tools

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

---

## Critical Rules for AI Assistants

1. **Translate everything**: Every user-facing string must use `m.*()`. Never hardcode text in any language.
2. **Always update both message files**: When adding a string, add it to both `messages/en.json` and `messages/fr.json`.
3. **Language switcher**: Use `<a data-sveltekit-reload>` links only. Never use `setLocale({ reload: false })`.
4. **Run build after changes**: Always run `pnpm run check && pnpm run lint && pnpm run build` after making changes to verify. Run `pnpm run format` before committing.
5. **Check git diff**: Before making changes, check `git diff` and `git status` to understand current state.
6. **Tooltips**: Use the `<Tooltip>` component, never the native `title` attribute.
7. **Follow existing patterns**: Look at neighboring files for code style, naming conventions, and import patterns.
8. **No comments**: Do NOT add comments to code unless explicitly asked.
9. **Anchor filtering**: In non-global views, filter anchor points by checking if their `lineId` is in `effectiveHiddenLineIds`.
10. **Diamond size**: When rendering diamond shapes, use `side = radius / sqrt(2)` for visual consistency with circles/squares.
11. **Label centering**: When `badgeAnchor='label'`, compute `badgeOffsetX` and use `adjustedLayout` for both label and badges.
12. **Key splitting**: For translations with styled elements (like `<kbd>`), use before/after key pattern so styled content can have CSS classes.
