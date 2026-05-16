# Changelog

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
