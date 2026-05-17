---
id: context-menu
title: Menu contextuel
order: 7
updated: 2026-05-17
---

Le menu contextuel (clic droit) donne un accès rapide aux actions selon l'élément cliqué.

## Clic droit sur une station

| Élément du menu          | Icône           | Action                                                 |
| ------------------------ | --------------- | ------------------------------------------------------ |
| **Modifier la station**  | `edit`          | Ouvre la station dans le panneau droit                 |
| **Supprimer la station** | `delete`        | Supprime la station du projet                          |
| **Ajouter à la ligne**   | `add_circle`    | Affiche la liste des lignes pour ajouter cette station |
| **Retirer de la ligne**  | `remove_circle` | Affiche la liste des lignes à déconnecter              |

> **Astuce :** Si une station est grisée sur le canevas, elle est peut-être masquée dans la vue actuelle. Faites un clic droit et choisissez **Afficher la station**.

## Clic droit sur une ligne

| Élément du menu        | Icône    | Action                                       |
| ---------------------- | -------- | -------------------------------------------- |
| **Modifier la ligne**  | `edit`   | Ouvre la ligne dans le panneau droit         |
| **Ajouter une ancre**  | `anchor` | Place un point d'ancrage à l'endroit du clic |
| **Supprimer la ligne** | `delete` | Supprime la ligne du projet                  |

> **Astuce :** Faites un clic droit sur une ligne et choisissez <guide-btn icon="visibility_off">Masquer la ligne</guide-btn> pour la cacher dans la vue actuelle, ou <guide-btn icon="visibility">Afficher la ligne</guide-btn> pour la réafficher.

## Clic droit sur une ancre

| Élément du menu       | Icône    | Action                          |
| --------------------- | -------- | ------------------------------- |
| **Modifier l'ancre**  | `edit`   | Ouvre les propriétés de l'ancre |
| **Supprimer l'ancre** | `delete` | Supprime le point d'ancrage     |

## Clic droit sur le canevas vide

| Élément du menu         | Icône          | Action                                     |
| ----------------------- | -------------- | ------------------------------------------ |
| **Ajouter une station** | `add_location` | Crée une nouvelle station à cette position |
| **Tout désélectionner** | `close`        | Efface toutes les sélections en cours      |

## Astuces pour le menu contextuel

- Quand **Ajouter à la ligne** ou **Retirer de la ligne** est désactivé, c'est qu'aucune ligne compatible n'est disponible
- Le sous-menu de sélection de ligne inclut une **zone de recherche** — tapez pour filtrer les lignes par nom
- Les groupes sont séparés par type de transport pour une navigation facile
