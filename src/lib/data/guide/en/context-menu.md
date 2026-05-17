---
id: context-menu
title: Right-Click Menu
order: 7
updated: 2026-05-17
---

The right-click (context) menu gives you quick access to actions depending on what you right-click.

## Right-Click on a Station

| Menu Item            | Icon            | Action                                                  |
| -------------------- | --------------- | ------------------------------------------------------- |
| **Edit station**     | `edit`          | Opens the station in the right panel                    |
| **Delete station**   | `delete`        | Removes the station from the project                    |
| **Add to line**      | `add_circle`    | Shows a searchable list of lines to add this station to |
| **Remove from line** | `remove_circle` | Shows a list of lines to disconnect this station from   |

> **Tip:** If a station is greyed out in the canvas, it might be hidden in the current view. Right-click and choose **Show station** to make it visible again.

## Right-Click on a Line

| Menu Item       | Icon     | Action                                         |
| --------------- | -------- | ---------------------------------------------- |
| **Edit line**   | `edit`   | Opens the line in the right panel              |
| **Add anchor**  | `anchor` | Places an anchor point where you right-clicked |
| **Delete line** | `delete` | Removes the line from the project              |

> **Tip:** Right-click on a line and choose <guide-btn icon="visibility_off">Hide line</guide-btn> to hide it in the current view, or <guide-btn icon="visibility">Show line</guide-btn> to bring it back.

## Right-Click on an Anchor

| Menu Item         | Icon     | Action                                         |
| ----------------- | -------- | ---------------------------------------------- |
| **Edit anchor**   | `edit`   | Opens the anchor properties in the right panel |
| **Delete anchor** | `delete` | Removes the anchor point                       |

## Right-Click on Empty Canvas

| Menu Item        | Icon           | Action                                |
| ---------------- | -------------- | ------------------------------------- |
| **Add station**  | `add_location` | Create a new station at that position |
| **Deselect all** | `close`        | Clears all current selections         |

## Context Menu Tips

- When **Add to line** or **Remove from line** is disabled, it means there are no compatible lines available
- The line picker submenu includes a **search box** — type to filter lines by name
- Groups are separated by transit type for easy navigation
