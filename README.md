# QRCommande

Application web de commande événementielle accessible par QR Code, permettant aux invités de passer des commandes en temps réel et au personnel de les gérer via un dashboard connecté à Supabase.

## MVP public

Cette première version implémente :

- l'accès direct sans authentification
- la vérification d'activation de l'événement
- l'affichage d'un menu premium responsive
- le chargement des articles depuis Supabase
- un mode démo pour prévisualiser l'interface sans credentials

Note produit : avec le schéma fourni (`id`, `name`, `category`, `is_active`), le champ `is_active` est utilisé comme indicateur de disponibilité visuelle dans le menu. Si tu veux à la fois filtrer strictement les lignes actives côté requête et afficher des cartes indisponibles, il faudra ajouter un second champ métier dédié à la disponibilité.

## Stack

- Vanilla JavaScript
- Vite
- Tailwind CSS
- GSAP
- Animate.css
- Supabase JS

## Démarrage

1. Copier `.env.example` vers `.env`
2. Renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
3. Ajuster `VITE_APP_ACTIVE` selon le statut de l'événement
4. Facultatif : garder `VITE_USE_DEMO_DATA=true` pour afficher des données de démonstration si Supabase n'est pas encore branché
5. Installer les dépendances avec `npm install`
6. Lancer le projet avec `npm run dev`

## Build

- `npm run build`
- `npm run preview`

## Schéma attendu

Table `articles` :

- `id`
- `name`
- `category`
- `is_active`
