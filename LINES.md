# Line Rendering Specification

## 1. Overview

A line is a sequence of stations (via `RoutePoint`) optionally with intermediate `AnchorPoint`s that define the path shape. Lines are rendered as SVG `<path>` elements with:

- Octilinear routing (only 0°, 45°, 90° segments)
- Perpendicular offsets when multiple lines share a station‑pair corridor
- Custom stroke width, dash pattern, color

Two rendering contexts use the same pipeline:

- **Editor** (`PlanView.svelte` → `<svg>`) — interactive, with selection/hover
- **SVG Export** (`ExportSvg.svelte` → serialized string) — static file

## 2. Data Model

### Line (`src/lib/types/line.ts`)

```ts
interface Line {
	id?: number;
	name: string;
	color: string;
	strokeWidth?: number; // defaults to LINE_WIDTH (6)
	dashPattern?: string; // e.g. "4,4", "8,4,2,4"
	transitTypeId?: number;
}
```

### RoutePoint (`src/lib/types/route-point.ts`)

Links a station to a line with ordering:

```ts
interface RoutePoint {
	id?: number;
	lineId: number;
	stationId: number;
	order: number; // float — can insert between existing
}
```

### AnchorPoint (`src/lib/types/anchor-point.ts`)

Intermediate geometry point between two stations on a line:

```ts
interface AnchorPoint {
	id?: number;
	lineId: number;
	schematicX: number;
	schematicY: number;
	order: number; // between the two surrounding RoutePoint orders
}
```

### Station (`src/lib/types/station.ts`)

```ts
interface Station {
	id?: number;
	schematicX: number;
	schematicY: number;
	// … label, direction, etc.
}
```

### Key relationships

- A `Line` has many `RoutePoint`s (one per station on that line).
- A `Line` has many `AnchorPoint`s placed between route points.
- Stations can be dragged (updates `schematicX`/`schematicY`).
- Anchor points can be dragged (updates `schematicX`/`schematicY`).

## 3. Rendering Requirements

Lines must be drawn connecting their route points and anchor points in the correct `order`.

When multiple lines travel between the same two stations (forming a corridor), they must be drawn parallel to each other. The spacing between parallel lines should be consistent (`LINE_SPACING = 6` pixels).

The visual output must satisfy these constraints:

- Smooth transitions: No visible jogs, back-and-forth zigzagging, or bulges when a line changes direction or enters/leaves a shared corridor.
- Octilinear geometry: All segments between points must be drawn using horizontal, vertical, or 45-degree diagonal lines.
- Consistent offsets: A line's offset from the center of a corridor must remain consistent along the entire path between the two stations, regardless of any intermediate anchor points.

## 4. Hidden Lines

- **Global view**: uses `project.hiddenLineIds` → stored in editor state.
- **View‑specific**: uses `view.hiddenLineIds` → stored in view model.
- Both are merged into `effectiveHiddenLineIds` in the editor store.
- Hidden lines are completely excluded from rendering (skip in `{#each}`).
- In SVG export, `data.hiddenLineIds` is used directly.

## 5. What NOT To Do (Previous Failures)

### ❌ Station‑Split

Duplicating the station point with different offsets for incoming vs outgoing sub‑segments. Creates visible back‑and‑forth jogs that extend outside the station circle.

### ❌ Averaging

Averaging the incoming and outgoing corridor offsets at each station point. Creates visible bulges when corridor direction changes (e.g., horizontal corridor → diagonal corridor).

### ❌ Sub‑Segment Topology

Computing separate offsets for each sub‑segment (between every consecutive point including anchors) instead of using station‑pair corridors. Causes lines that join mid‑segment at an anchor to get different offsets on different sides of the anchor.

### ❌ Offset Direction from Sub‑Segment

Using the sub‑segment's own direction for the perpendicular. A diagonal sub‑segment between two vertical stations gets a different perpendicular direction than the vertical corridor, causing misaligned offsets.
