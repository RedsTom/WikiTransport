---
id: stations
title: Working with Stations
order: 2
updated: 2026-05-17
---

## Adding a Station

**Method 1 — Toolbar:** Click <guide-btn icon="add_location">Add station</guide-btn> in the bottom toolbar (or press `S`). The cursor becomes a crosshair. Click anywhere on the canvas to place the station, then enter its name in the dialog.

**Method 2 — Right-click:** Right-click on empty canvas space and choose <guide-btn icon="add_location">Add station</guide-btn>. The station will be placed where you clicked.

## Selecting a Station

Simply click a station to select it. A selected station has a **thick black outline**. The right panel will show its properties.

## Moving a Station

Click and drag a station to move it. The connecting lines follow automatically.

## Multi-Selecting Stations

You can work with multiple stations at once:

- **Ctrl+click** or **Shift+click** a station to add it to (or remove it from) the selection
- **Shift+drag** on empty canvas draws a **selection rectangle** — everything inside gets selected
- Once multiple stations are selected, **drag any one of them** to move all selected stations together. The line in the toolbar shows a count like "3 Stations".
- Press `Delete` to remove all selected stations at once

## Station Properties

Select a station to edit its properties in the right panel:

- **Name** and **subtitle** — the station's label text
- **Position** (X, Y) — fine-tune the location numerically
- **Label direction** — choose where the name appears: N, NE, E, SE, S, SW, W, or NW
- **Label distance** — how far from the station point the label sits (Dx, Dy)
- **Subtitle alignment** — left, center, or right aligned under the main name

All label settings can also be adjusted per view (see the Views section).

## Interchange Badges

When working in a **view**, lines that are hidden for that view can still appear as **interchange badges** on stations they serve. This is useful for showing "you can transfer here" without cluttering the map.

To set this up:

1. Switch to a non-global view
2. Select a station that is served by a hidden line
3. In the right panel, under **Interchange display**, choose:
   - **Relative to station** — badges positioned relative to the station point
   - **Next to text** — badges aligned next to the station name
   - **Stack with text** — badges stacked with the station name
4. Adjust **Interchange position** to place badges in one of 8 directions
5. Toggle individual lines on/off in the serving lines list

## Deleting a Station

Select a station and press `Delete` or `Backspace`, or right-click the station and choose <guide-btn icon="delete">Delete station</guide-btn>. You can also use the **Delete** button in the station properties panel.
