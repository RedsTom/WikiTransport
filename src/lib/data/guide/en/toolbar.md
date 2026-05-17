---
id: toolbar
title: Toolbar
order: 8
updated: 2026-05-17
---

The toolbar sits at the **bottom center** of the editor and gives you quick access to the most common actions.

## Line Selector

The left side of the toolbar shows the currently selected line with its colored dot and name. Click it to open a searchable list of all lines. Click <guide-btn icon="close">Close</guide-btn> (or press `D`) to deselect the line.

## Station Selector

Next to the line selector is the current station. When no station is selected, it shows "No station". Click to open a searchable list of all stations.

When **multiple stations** are selected, the toolbar shows a count badge like "3 Stations" instead of the station selector. Click <guide-btn icon="close">Close</guide-btn> to clear the multi-selection.

## Action Buttons

### <guide-btn icon="add_location">Add station</guide-btn>

Click to enter **placement mode** — the cursor becomes a crosshair and the canvas dims. Click anywhere to place a station. Press `Esc` or click the button again to cancel.

**Keyboard shortcut:** `S`

### Before / After Buttons

When you have both a line and a station selected that is already on that line, the toolbar shows two buttons:

- <guide-btn icon="new_label">Add station before</guide-btn> (icon flipped) — adds a new station on the line before the selected one
- <guide-btn icon="new_label">Add station after</guide-btn> — adds a new station after the selected one

**Keyboard shortcuts:** `Shift+S` (before), `S` (after)

### <guide-btn icon="anchor">Add anchor</guide-btn>

Click to enter **anchor placement mode**. Click on a line segment to add an anchor point. Press `Esc` to cancel.

**Keyboard shortcut:** `A`

## Multi-Selection Indicator

When you select multiple stations or anchors (using Ctrl/Shift+click or rubber-band), the toolbar shows:

- A count badge: "3 Stations" or "2 Anchors"
- <guide-btn icon="close">Close</guide-btn> to clear the selection

Drag any selected element on the canvas to move all selected elements together.
