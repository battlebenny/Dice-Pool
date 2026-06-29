# 🎲 Dice Pool — Simulateur de Dés Physique 2.5D

Un simulateur de lancer de dés haute fidélité qui reproduit la physique de collision et les interactions de rebond d'un plateau de jeu réel. L'application est structurée autour d'un parcours utilisateur en trois écrans séquentiels immersifs pour un suspens et une clarté analytique maximisés.

---

## 🌟 Fonctionnalités Clés

### 1. Expérience Utilisateur en 3 Écrans Séquentiels
*   **Écran de Démarrage (Start Screen) :**
    *   Interface d'accueil épurée présentant le logo et le titre du projet **Dice Pool**.
    *   Panneau d'options personnalisables pour activer/désactiver le **retour sonore spatialisé** et le **lancement par secousse** (accéléromètre mobile).
    *   Bouton d'action principal pour lancer instantanément la session physique.
*   **Arène de Lancer (Roll Arena) :**
    *   Moteur physique 2.5D temps réel avec prise en compte de la friction, de l'élasticité et des collisions inter-dés et parois.
    *   Interaction tactile et souris permettant de cliquer-glisser les dés pour modifier leur trajectoire ou les faire rebondir manuellement.
    *   **Gobelet opaque de suspens :** Un écran de masquage s'affiche une fois la physique stabilisée pour cacher le tirage. Cliquez pour soulever le gobelet et révéler le résultat en direct !
    *   Bouton d'accès direct vers le rapport d'analyse une fois le tirage dévoilé.
*   **Rapport de Fin de Session (Results & Stats) :**
    *   **Score Total Cumulé :** Affichage géant de la somme des faces des 12 dés.
    *   **Statistiques de Tirage :** Valeur maximale obtenue, moyenne globale calculée.
    *   **Sous-groupes de Masse :** Cumul des scores spécifiques aux 6 grands dés (format lourd) et aux 6 petits dés (format léger).
    *   **Détection d'Alignements :** Analyse automatique des combinaisons (doublons, triplés, occurrences identiques).
    *   **Inventaire Détaillé :** Liste exhaustive des 12 dés avec couleur, taille, format géométrique et face finale exacte.
    *   Bouton pour relancer instantanément une nouvelle session.

---

## 🛠️ Spécifications Techniques

*   **Framework :** React 18+ & TypeScript.
*   **Build System :** Vite.
*   **Moteur Physique :** Simulation mathématique personnalisée en 2D avec rendu perspective 2.5D (calculs de vélocité, gravité artificielle, force de rebond et résistance de glissement).
*   **Moteur Audio :** Synthétiseur et lecture d'échantillons avec l'**API Web Audio** pour un bruitage spatialisé dynamique en fonction de la force des collisions.
*   **Capteurs Mobiles :** Support du gyroscope et de l'accéléromètre (`DeviceMotionEvent`) pour initier ou perturber la trajectoire par secousse physique de l'appareil.
*   **Design & Style :** Tailwind CSS complet avec thème sombre haute précision (Midnight/Slate), animations fluides intégrées par transition et typographies robustes.
*   **Icônes :** Lucide React.

---

## 📁 Structure du Projet

```bash
├── src/
│   ├── App.tsx                    # Composant maître, gestion des écrans et de l'état global
│   ├── index.css                  # Styles globaux et variables de thème Tailwind
│   ├── main.tsx                   # Point d'entrée de l'application
│   ├── components/
│   │   └── DiceCanvas.tsx         # Moteur physique sur Canvas et rendu visuel 2.5D
│   └── utils/
│       ├── audio.ts               # Synthétiseur de bruitages de collision (Web Audio API)
│       └── diceGeometries.ts      # Définition des coordonnées et géométries des faces des dés
├── progression.md                 # Historique de progression et étapes validées
├── ideas.md                       # Pistes d'améliorations et concepts de design
├── package.json                   # Dépendances et scripts de build
└── README.md                      # Documentation du projet (ce fichier)
```

---

## 🚀 Lancement Rapide

### Prérequis
*   [Node.js](https://nodejs.org/) (Version 18 ou supérieure recommandée)
*   `npm` ou `yarn`

### Installation
Installez l'ensemble des dépendances du projet :
```bash
npm install
```

### Développement
Lancez le serveur de développement local :
```bash
npm run dev
```
L'application sera accessible par défaut sur `http://localhost:3000`.

### Production
Compilez et optimisez l'application pour la production :
```bash
npm run build
```
Les fichiers optimisés seront générés dans le dossier `/dist`.
