---
id: views
title: Working with Views
order: 5
updated: 2026-05-17
---

## What are Views?

Views let you create **different layouts** of the same network. Each view has its own:

- Station positions (override the global layout)
- Anchor point positions
- Hidden lines and stations
- Line arrangement in shared segments

This is useful for highlighting specific lines, creating simplified diagrams, or focusing on a particular area of your network.

## The Global View

The **global view** is the default. It shows everything with no overrides. When you create a new view, it starts as a clone of the global state — you can then customize it.

## Creating a View

1. Click the view name in the header (it says "Global" by default)
2. Click **New View**
3. Enter a name (e.g., "Downtown Focus" or "Night Service")
4. Click **Create**

The new view becomes active immediately.

## Hiding Lines

- **Right-click** a line and choose <guide-btn icon="visibility_off">Hide line</guide-btn> to hide it in the current view
- Hidden lines turn grey in the Overview tab
- Stations that are ONLY on hidden lines also become hidden

Right-click again and choose <guide-btn icon="visibility">Show line</guide-btn> to unhide.

## Hiding Stations

- **Right-click** a station and choose <guide-btn icon="visibility_off">Hide station</guide-btn>
- The station disappears from the current view but still exists globally

## Interchange Badges

When a line is hidden in a view, the stations it serves can show **interchange badges** — small colored icons indicating you can transfer to that hidden line. See the Stations section for details on configuring these.

## Switching Views

Click the view selector in the header to switch between views. Each view remembers its own canvas position and zoom level.

## Deleting a View

Right-click a view name in the header to open a context menu with rename and delete options.
