# Changelog

## 0.15.0-beta (2026-05-17)

**EN:** User Interface Refinement & New Guide

- Added a comprehensive user guide accessible from the dashboard and editor
- Refined the projects page with a more consistent and modern look
- Improved the beta notice with direct bug report action
- Restructured code for better maintainability and performance
- Extracted shared rendering utilities to ensure visual consistency
- Improved multi-select and rubber-band selection in the editor

**FR:** Affinement de l'interface & Nouveau Guide

- Ajout d'un guide utilisateur complet accessible depuis le tableau de bord et l'éditeur
- Affinement de la page des projets avec un look plus cohérent et moderne
- Amélioration de la bannière bêta avec action directe de signalement de bug
- Restructuration du code pour une meilleure maintenabilité et performance
- Extraction des utilitaires de rendu partagés pour assurer la cohérence visuelle
- Amélioration de la multi-sélection et de la sélection par rectangle dans l'éditeur

## 0.14.0-beta (2026-05-17)

**EN:** Tunnel-based rendering & corner radius

- Complete line rendering overhaul with tunnel-aware offsets and segment ordering
- Per-view corner radius on path angle nodes with slider and reset
- Corner properties panel (selectable from the segment list)
- Geometry utilities extracted to a dedicated module

**FR:** Rendu basé sur les tunnels et coins arrondis

- Refonte complète du rendu des lignes avec décalages par tunnel et ordre des segments
- Rayon d'arrondi par vue sur les nœuds d'angle du tracé avec curseur et réinitialisation
- Panneau de propriétés d'angle (sélectionnable depuis la liste des segments)
- Extraction des utilitaires de géométrie dans un module dédié

## 0.13.0-beta (2026-05-16)

**EN:** Station naming dialog & anchor list fix

- A dialog asks for the station name when creating one, instead of auto-naming
- Fixed the anchor list not updating when a new line is created (showed stale data from previous line)
- Removed autofocus on the station name field in the properties panel

**FR:** Dialogue de nommage des stations & correction de la liste d'ancres

- Un dialogue demande le nom de la station lors de sa création, au lieu d'un nom automatique
- Correction : la liste d'ancres n'affichait plus les données de l'ancienne ligne après création d'une nouvelle
- Suppression de l'autofocus sur le champ du nom dans les propriétés

## 0.12.0-beta (2026-05-16)

**EN:** Compact project export (.wtpc) — GZIP-compressed files for smaller exports

- New `.wtpc` export format with GZIP compression for smaller file sizes
- Click the download button on any project to choose between Normal (.wtp) and Compact (.wtpc)
- Import auto-detects both formats automatically
- New translations: `export_standard`, `export_compact`

**FR:** Export de projet compact (.wtpc) — fichiers compressés GZIP pour des exports plus légers

- Nouveau format `.wtpc` avec compression GZIP pour des fichiers plus légers
- Cliquez sur le bouton de téléchargement d'un projet pour choisir entre Normal (.wtp) et Compact (.wtpc)
- L'import détecte automatiquement les deux formats
- Nouvelles traductions : `export_standard`, `export_compact`

## 0.11.0-beta (2026-05-16)

**EN:** Language persistence fix — no more resets to English when navigating between pages

- Language no longer resets to English when clicking internal links
- Switched from URL-prefix-based locale detection (`/fr/...`) to cookie-only strategy
- Replaced `<a data-sveltekit-reload>` with `<button>` for instant, no-reload language switching
- Root layout uses `{#key useLocale()}` to re-render all translated content on locale change

**FR:** Correction de la persistance de la langue — fin des réinitialisations en anglais

- La langue ne se réinitialise plus en anglais lors de la navigation entre les pages
- Passage d'une détection par préfixe d'URL (`/fr/...`) à une stratégie uniquement par cookie
- Remplacement des `<a data-sveltekit-reload>` par des `<button>` pour un changement instantané
- Le layout racine utilise `{#key useLocale()}` pour réafficher tout le contenu traduit

## 0.10.0-beta (2026-05-16)

**EN:** Context menus everywhere — right-click on anything for instant actions

- Right-click on stations, lines, and types in the Overview tab for contextual actions
- Right-click on the plan background to instantly add a station at that position
- Right-click on a line to instantly add an anchor point on the line
- Right-click on a station to remove it from a specific line
- Extracted `LinePicker` component shared between toolbar and context menus
- New translations: `remove_from_line`, `edit_type`

**FR:** Des menus contextuels partout — faites un clic droit pour agir instantanément

- Clic droit sur les stations, lignes et types dans l'onglet Aperçu
- Clic droit sur le fond du plan pour ajouter une station à cet endroit
- Clic droit sur une ligne pour ajouter un point d'ancrage sur la ligne
- Clic droit sur une station pour la retirer d'une ligne spécifique
- Composant `LinePicker` partagé entre la barre d'outils et les menus contextuels
- Nouvelles traductions : `remove_from_line`, `edit_type`

## 0.9.1-beta (2026-05-16)

**EN:** Internal codebase refactoring — no visible changes for end users

- Extracted viewport state from PlanView into a reusable `useViewport.svelte.ts` module
- Created `StationLabelControls` and `ViewManager` components to reduce large file sizes
- Split `ProjectExportService` into dedicated export and import services

**FR:** Refonte interne du code — aucun changement visible pour les utilisateurs

- Extraction de la gestion du viewport de PlanView vers un module `useViewport.svelte.ts`
- Création des composants `StationLabelControls` et `ViewManager`
- Séparation de `ProjectExportService` en services d'export et d'import

## 0.9.0-beta (2026-05-16)

**EN:** Social embed previews — links now show a rich preview on Discord, Twitter, and other platforms

- Added Open Graph and Twitter Card meta tags for rich link previews
- Platforms like Discord display the site name, a screenshot preview, and a brief description
- Description is translated in English and French depending on the viewer's language

**FR:** Aperçus enrichis sur les réseaux — les liens affichent désormais un aperçu sur Discord, Twitter et autres plateformes

- Ajout des meta tags Open Graph et Twitter Card pour les aperçus de liens
- Discord affiche le nom du site, une capture d'écran et une description
- La description est traduite selon la langue du visiteur

## 0.8.0-beta (2026-05-16)

**EN:** Revamped landing page with updated screenshots and a brand-new README focused on the project vision

- Updated homepage with cleaner asset references (new screenshot, renamed files)
- Completely rewrote the README to be more inspiring, less technical
- Added "Who is it for?" section for transit enthusiasts, planners, and creators

**FR:** Nouvelle page d'accueil avec des captures à jour et un README repensé autour de la vision du projet

- Mise à jour de la page d'accueil avec des références d'images plus propres
- Réécriture complète du README pour donner plus envie
- Ajout d'une section « Pour qui ? »

## 0.7.0-beta (2026-05-16)

**EN:** Changelog section on the projects page with version history and beta version naming

- Added a dedicated changelog section on the projects page with expand/collapse per version
- Created bilingual changelog files for all past versions (0.1.0 through 0.6.0)
- Standardized all version names to `-beta` suffix for consistency
- Added loading spinner while projects load from IndexedDB
- Redesigned the deploy workflow with automated changelog generation

**FR:** Section journal des modifications sur la page projets avec nomenclature beta

- Ajout d'une section dédiée au journal des modifications sur la page projets
- Création de fichiers bilingues pour toutes les versions passées (0.1.0 à 0.6.0)
- Uniformisation des versions avec le suffixe `-beta`
- Ajout d'un indicateur de chargement sur la page projets
- Refonte du workflow de déploiement avec génération automatique du journal

## 0.6.0-beta (2026-05-16)

**EN:** Performance optimizations and project export/import in .wtp format

- Optimized rendering performance with separated topology/position computations and indexed lookups
- Fixed data loss on station property saves
- Added project export and import in .wtp format
- Refactored projects page with Import, Export, and New Project buttons
- Fixed station dragging in view-specific views
- Improved database query performance with compound indexes

**FR:** Optimisations des performances et export/import de projet au format .wtp

- Optimisation des performances de rendu avec calculs topologie/position séparés
- Correction de la perte de données lors de la sauvegarde des propriétés de station
- Ajout de l'export et de l'import de projet au format .wtp
- Refonte de la page projets avec boutons Importer, Exporter et Nouveau Projet
- Correction du déplacement des stations dans les vues personnalisées
- Amélioration des performances des requêtes DB avec index composés

## 0.5.0-beta (2026-05-15)

**EN:** Redesigned dialogs, improved toolbar, and enhanced panel experience

- Redesigned dialogs with icons and auto-focused confirm buttons
- Reorganized right panel tabs as a vertical icon bar
- Added auto-switching right panel tab on station or line selection
- Added collapsible title bars to side panels
- Fixed drag-and-drop anchor behavior in lists
- Unified toolbar button sizes and styling

**FR:** Refonte des dialogues, amélioration de la barre d'outils et des panneaux

- Refonte des dialogues avec icônes et boutons de confirmation auto-focus
- Réorganisation des onglets du panneau droit en barre d'icônes verticale
- Auto-commutation de l'onglet droit lors de la sélection d'une station ou ligne
- Ajout de barres de titre escamotables aux panneaux latéraux
- Correction du glisser-déposer des ancres dans les listes
- Uniformisation de la taille et du style des boutons d'outils

## 0.4.0-beta (2026-05-12)

**EN:** Major codebase refactoring and SVG export rewrite

- Modularized the codebase for better maintainability
- Rewrote SVG export as Svelte components instead of string rendering
- Migrated to Svelte 5 reactivity primitives
- Fixed tooltip Popover API and made toolbar buttons uniform
- Decoupled left and right panel tab states

**FR:** Refonte majeure du code et réécriture de l'export SVG

- Modularisation du code pour une meilleure maintenabilité
- Réécriture de l'export SVG en composants Svelte
- Migration vers les primitives de réactivité Svelte 5
- Correction de l'API Popover des infobulles et uniformisation des boutons
- Décorrélation des états des panneaux gauche et droit

## 0.3.0-beta (2026-05-11)

**EN:** Added PWA offline support, station placement tools, and drag-and-drop reordering

- Added PWA offline support with service worker and auto-update
- Added station insertion by clicking on the plan in placement mode
- Added anchor placement by clicking on a line segment
- Added drag-and-drop anchor reordering with keyboard shortcuts
- Fixed anchor ordering near line terminuses

**FR:** Ajout du support PWA hors ligne, des outils de placement et du glisser-déposer

- Ajout du support PWA hors ligne avec service worker et mise à jour automatique
- Insertion de station par clic sur le plan en mode placement
- Placement d'ancres par clic sur un segment de ligne
- Réordonnancement des ancres par glisser-déposer avec raccourcis clavier
- Correction du classement des ancres près des terminus

## 0.2.0-beta (2026-05-10)

**EN:** Added landing page, view-based routing, and interchange badge system

- Added landing page with feature showcase
- Moved project list to /projects route with view-based routing
- Added per-view viewBox persistence
- Improved interchange badge UI and legend rendering
- Added fit-content centering and too-far indicator

**FR:** Ajout de la page d'accueil, du routage par vue et des badges de correspondance

- Ajout de la page d'accueil avec présentation des fonctionnalités
- Routage par vue avec persistance du viewBox
- Amélioration de l'interface des badges de correspondance
- Centrage automatique et indicateur de déplacement

## 0.1.0-beta (2026-05-08)

**EN:** First release of WikiTransport with a fully functional schematic transit map editor

- Complete editor with SVG schematic plan view (grid, lines, stations, anchors)
- Property editors for stations, lines, and types
- Dexie.js IndexedDB database for offline storage
- Material 3 UI component library
- i18n with English and French translations
- Project management (create, delete, list)

**FR:** Première version de WikiTransport avec un éditeur de plans de transport fonctionnel

- Éditeur complet avec vue schématique SVG (grille, lignes, stations, ancres)
- Éditeurs de propriétés pour stations, lignes et types
- Base de données IndexedDB Dexie.js pour le stockage hors ligne
- Bibliothèque de composants UI Material 3
- i18n avec traductions anglais et français
- Gestion de projets (création, suppression, liste)
