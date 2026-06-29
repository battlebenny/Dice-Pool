# Progression du Projet - Lancer de Dés Physiques

Suivi de l'avancement du développement de l'application de dés physiques.

- [x] Étape 1 : Conception géométrique et mathématique des dés 3D (D4, D6, D8, D10, D12, D20)
- [x] Étape 2 : Création du synthétiseur de cliquetis de dés (Web Audio API)
- [x] Étape 3 : Développement du composant de simulation physique (Canvas 2.5D + Collisions)
- [x] Étape 4 : Intégration du composant Canvas et de la détection de secousse (DeviceMotion)
- [x] Étape 5 : Gestion des états de jeu (Lancement, Compte à rebours de 10s, Masquage, Révélation)
- [x] Étape 6 : Raffinement visuel, design "Midnight Velvet", typographies et polissage final
- [x] Étape 7 : Tests de compilation et validation globale
- [x] Étape 8 : Découpage de l'application en 3 écrans séquentiels (Écran de démarrage avec options, Écran d'arène avec gobelet opaque de révélation, Écran de fin avec statistiques détaillées et bouton de relance)
- [x] Étape 9 : Nettoyage et suppression de l'en-tête de statut redondant dans l'arène de lancer pour maximiser la hauteur
- [x] Étape 10 : Correction du bug d'initialisation des dés figés à 1 sur l'arène (synchronisation de `isRollingRef` au montage)
- [x] Étape 11 : Ajustement de la hauteur du canvas physique pour qu'il occupe 100% de la hauteur de son conteneur
- [x] Étape 12 : Conversion en Progressive Web App (PWA) avec manifeste d'installation, icône haute définition dédiée, service worker et bannières de gestion de cache / mise à jour à la livraison de nouvelles versions
- [x] Étape 13 : Sécurisation du geste de secousse sur mobile (interdiction pendant la phase masquée ou révélée, obligation de toucher l'écran pour relancer quand l'arène est visible)
- [x] Étape 14 : Correction du bug d'auto-agrandissement indéfini sous Google Chrome par un positionnement absolu du Canvas brisant la boucle ResizeObserver
- [x] Étape 15 : Amélioration de la conformité PWA (génération d'icônes PNG haute résolution standardisées 192x192, 512x512 et maskable, et injection explicite des métadonnées mobiles et du lien de manifest dans index.html pour une installabilité directe et parfaite sur Android Chrome et iOS Safari)

