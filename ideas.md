# Idées de Conception - Lancer de Dés Physiques

Ce document regroupe les idées clés pour concevoir et développer le jeu de lancer de 12 dés avec physique réaliste.

## 1. Géométries des Dés 3D (Polyèdres)
Pour que les dés soient réalistes, nous allons définir leurs sommets (vertices) et leurs faces en 3D, puis les projeter en 2D sur le canvas à l'aide d'une matrice de rotation 3D.
- **D4 (Tétraèdre)** : 4 sommets, 4 faces triangulaires.
- **D6 (Cube)** : 8 sommets, 6 faces carrées.
- **D8 (Octaèdre)** : 6 sommets, 8 faces triangulaires.
- **D10 (Trapézoèdre pentagonal)** : 12 sommets, 10 faces (cerfs-volants), modélisé précisément.
- **D12 (Dodécaèdre)** : 20 sommets, 12 faces pentagonales.
- **D20 (Icosaèdre)** : 12 sommets, 20 faces triangulaires.

Chaque face aura un numéro unique associé (de 1 à N). La face supérieure visible (le résultat du dé) sera celle dont la normale 3D a la composante Z la plus élevée vers l'observateur.

## 2. Physique 2.5D Réaliste sur Canvas
Pour maximiser la performance et assurer un fonctionnement sans faille dans l'iframe, nous utiliserons un moteur physique 2D robuste écrit sur mesure pour la translation des dés, combiné à un modèle de rotation 3D :
- **Mouvement 2D** : Chaque dé a une position `(x, y)` et une vitesse `(vx, vy)`.
- **Limites de l'écran** : Rebondissements élastiques sur les bords du canvas avec perte d'énergie (restitution ~0.7).
- **Collisions Dé-Dé** : Résolution des collisions de disques (pour la simplicité et la robustesse du moteur physique) ou de boîtes orientées, avec transfert de quantité de mouvement et rebond réaliste.
- **Rotation 3D** : Chaque dé a trois angles de rotation `(rx, ry, rz)` et des vitesses angulaires associées `(drx, dry, drz)`.
- **Frottements & Gravité** :
  - Friction linéaire (amortissement) pour ralentir progressivement les dés.
  - Friction de rotation pour arrêter la rotation des dés lorsqu'ils s'immobilisent.
  - Optionnellement, une légère force de gravité ou de secousse dirigée pour simuler l'inclinaison du téléphone.

## 3. Synthèse Audio Intégrée (Web Audio API)
Au lieu de charger de lourds fichiers sonores, nous allons synthétiser en temps réel les bruits d'entre-chocs des dés et des impacts sur les rebords :
- **Impact dé/mur** : Un son percutant court (bruit blanc filtré avec une enveloppe de décroissance exponentielle rapide + onde sinusoïdale basse fréquence).
- **Collision dé/dé** : Un cliquetis plus aigu (fréquence plus élevée, durée extrêmement courte, proportionnelle à l'intensité de l'impact).

## 4. Esthétique & Thème Visuel ("Midnight Wood & Velvet")
Le design visuel sera extrêmement soigné :
- **Plateau** : Un tapis de feutre de casino vert profond ou bleu nuit, avec une texture douce et des bordures élégantes en bois chaleureux.
- **Effets de lumière** : Les dés seront rendus avec des faces ombragées selon leur orientation par rapport à une source de lumière virtuelle située en haut à gauche (Lambertian shading simple : produit scalaire de la normale de la face et du vecteur lumière).
- **Révélation Temporelle** :
  - **Lancement** : Les dés roulent de manière dynamique. Une minuterie de 10s s'affiche discrètement.
  - **Écran Noir** : À 10,0s pile, une transition fluide vers un écran noir opaque avec un bouton de révélation central et mystérieux.
  - **Révélation** : Une animation de fondu dévoile le plateau figé avec les dés et affiche un panneau récapitulatif élégant listant tous les dés et leurs valeurs tirées.

## 5. Interaction Tactile et Secousse
- **Bouton Lancer** : Un grand bouton tactile réactif avec des micro-animations de rebond au clic.
- **Détection de Secousse (Shake)** : Utilisation de l'API `DeviceMotionEvent` pour détecter un mouvement brusque du téléphone, permettant de secouer et de lancer les dés naturellement sur mobile.
