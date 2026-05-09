## Project Configuration

- **Language**: TypeScript
- **Package Manager**: pnpm
- **Add-ons**: prettier, eslint, tailwindcss, paraglide, mcp

---

## Project Overview

WikiTransport is a web-based schematic transit map editor. Users create metro/bus/tram-style line maps with stations, anchor points, and customizable line types. It uses SvelteKit 5 with Melt UI for interactive components and Paraglide-JS for internationalization (i18n).

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

### Component Architecture

- `src/lib/components/editor/` — Editor panels (LeftPanel, RightPanel, ToolBar, StationProperties, LineProperties, TypeProperties, ProjectProperties)
- `src/lib/components/schematic/` — SVG plan rendering (PlanView)
- `src/lib/components/ui/` — Reusable UI primitives (Button, Dialog, TextField, Select, Slider, IconButton, Tooltip, StationSelector, ContextMenu, etc.)

### Data Flow

- Global editor state is managed in `src/lib/store/editor.svelte.ts` via Svelte 5 `$state` runes.
- Services (`src/lib/services/`) wrap Dexie.js indexedDB operations.
- Data models are defined in `src/lib/types/models.ts`.

### UI Conventions

- **Tooltips**: always use the `<Tooltip>` component (not the native `title` attribute). Import from `$lib/components/ui`.
- **Icons**: Material Symbols Outlined (`<span class="material-symbols-outlined">icon_name</span>`).
- **Colors**: Use CSS custom properties (`--color-surface`, `--color-primary`, etc.) following Material 3 theming.
- **Dialogs**: Use the `<Dialog>` component with `{#snippet title()}`, `{#snippet actions()}`.
- **Keyboard shortcuts**: Appended outside translation calls, e.g. `{m.cancel()} (Esc)`.

### Svelte 5 Conventions

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
4. **Run build after changes**: Always run `npx tsc --noEmit && npx vite build` after making changes to verify.
5. **Check git diff**: Before making changes, check `git diff` and `git status` to understand current state.
6. **Tooltips**: Use the `<Tooltip>` component, never the native `title` attribute.
7. **Follow existing patterns**: Look at neighboring files for code style, naming conventions, and import patterns.
8. **No comments**: Do NOT add comments to code unless explicitly asked.
