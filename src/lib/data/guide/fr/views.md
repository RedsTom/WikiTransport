---
id: views
title: Travailler avec les vues
order: 5
updated: 2026-05-17
---

## Que sont les vues ?

Les vues permettent de créer **différents agencements** du même réseau. Chaque vue possède ses propres :

- Positions des stations (remplacement de la disposition globale)
- Positions des points d'ancrage
- Lignes et stations masquées
- Ordre des lignes sur les segments partagés

Utile pour mettre en valeur des lignes spécifiques, créer des diagrammes simplifiés, ou se concentrer sur une zone particulière.

## La vue globale

La **vue globale** est la vue par défaut. Elle affiche tout sans remplacement. Quand vous créez une nouvelle vue, elle démarre comme un clone de l'état global.

## Créer une vue

1. Cliquez sur le nom de la vue dans l'en-tête ("Globale" par défaut)
2. Cliquez sur **Nouvelle vue**
3. Saisissez un nom (ex : "Centre-ville" ou "Service de nuit")
4. Cliquez sur **Créer**

La nouvelle vue devient active immédiatement.

## Masquer des lignes

- **Clic droit** sur une ligne et choisissez <guide-btn icon="visibility_off">Masquer la ligne</guide-btn> pour la cacher dans la vue courante
- Les lignes masquées deviennent grises dans l'onglet Vue d'ensemble
- Les stations qui ne sont QUE sur des lignes masquées sont également cachées

Refaites un clic droit et choisissez <guide-btn icon="visibility">Afficher la ligne</guide-btn> pour la réafficher.

## Masquer des stations

- **Clic droit** sur une station et choisissez <guide-btn icon="visibility_off">Masquer la station</guide-btn>
- La station disparaît de la vue courante mais existe toujours globalement

## Badges de correspondance

Quand une ligne est masquée dans une vue, les stations qu'elle dessert peuvent afficher des **badges de correspondance** — des petites icônes colorées indiquant qu'on peut y correspondre. Voir la section Stations pour les détails de configuration.

## Changer de vue

Cliquez sur le sélecteur de vue dans l'en-tête pour changer de vue. Chaque vue mémorise sa propre position du canevas et son niveau de zoom.

## Supprimer une vue

Faites un clic droit sur le nom d'une vue dans l'en-tête pour ouvrir un menu contextuel avec les options de renommage et de suppression.
