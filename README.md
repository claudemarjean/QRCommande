# QRCommande

Application mobile de commande événementielle accessible par QR Code, permettant aux invités de passer des commandes instantanément depuis leur téléphone.

##  Interface Mobile Moderne

L'application dispose maintenant d'une interface **100% optimisée mobile** qui ressemble à une vraie app native :

###  Fonctionnalités
- **Top App Bar** avec recherche en temps réel
- **Navigation par catégories** avec tabs horizontales
- **Cards compactes** et modernes pour chaque article
- **Bottom Navigation** fixe (Menu, Panier, Commandes, Compte)
- **Design moderne** avec gradients purple/violet
- **Animations fluides** et transitions smoothes
- **PWA-ready** - Installable comme app mobile
- **Responsive** - S'adapte parfaitement au mobile ET desktop

###  Palette de couleurs
- Gradient principal : Purple (#667eea) → Violet (#764ba2)
- Accent disponible : Green gradient
- Statut épuisé : Gris neutre
- Background : Gris clair (#f8f9fa)

## MVP public

Cette première version implémente :

- l'accès direct sans authentification
- la vérification d'activation de l'événement
- l'affichage d'un menu premium responsive
- le chargement des articles depuis Supabase
- la validation de commande avec creation de `orders` puis `order_items`
- un mode démo pour prévisualiser l'interface sans credentials

Note produit : avec le schéma fourni (`id`, `name`, `category`, `is_active`), le champ `is_active` est utilisé comme indicateur de disponibilité visuelle dans le menu. Si tu veux à la fois filtrer strictement les lignes actives côté requête et afficher des cartes indisponibles, il faudra ajouter un second champ métier dédié à la disponibilité.

## Stack

- Vanilla JavaScript
- Vite
- Tailwind CSS
- GSAP
- Animate.css
- Supabase JS

## Architecture

- [src/app.js](src/app.js) orchestre le cycle de vie de l'application et la navigation principale
- [src/auth.js](src/auth.js) centralise login, logout, restauration de session et écoute des changements Auth
- [src/userState.js](src/userState.js) centralise l’état utilisateur admin/staff côté frontend
- [src/config.js](src/config.js) centralise la configuration d'environnement et les garde-fous applicatifs
- [src/cart.js](src/cart.js) isole la logique panier et la persistance locale
- [src/supabaseClient.js](src/supabaseClient.js) encapsule l'accès aux données et normalise les articles
- [src/ui.js](src/ui.js) concentre le rendu et les interactions DOM
- [src/adminUi.js](src/adminUi.js) rend les pages protégées Dashboard, Commandes, Articles, Catégories et Paramètres
- [src/components/menuPublic.js](src/components/menuPublic.js) et [src/components/menuAdmin.js](src/components/menuAdmin.js) génèrent les navigations dynamiques
- [src/animations.js](src/animations.js) isole les animations GSAP

Principes appliqués:

- responsabilité unique par module
- validation des données externes avant usage UI
- réduction du couplage entre orchestration, stockage et accès réseau
- rendu HTML durci contre les injections de contenu

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

Table `orders` :

- `id`
- `order_number`
- `table_label`
- `created_at`
- `status` (UUID vers `order_statuses.id`)

Table `order_statuses` :

- `id`
- `code`
- `label`
- `is_active`
- `position`
- `created_at`

Table `order_items` :

- `id`
- `order_id`
- `article_id`
- `quantity`
