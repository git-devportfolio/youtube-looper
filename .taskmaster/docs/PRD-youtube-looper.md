# PRD – Application **YouTube Looper**

## 1. Contexte et Objectif

Développer une **application web responsive en Angular** permettant de **boucler un segment précis d’une vidéo YouTube** afin de faciliter le travail instrumental (ex. guitare).
L’objectif est de fournir un outil **simple, efficace et ergonomique** pour répéter un passage musical, avec une interface minimaliste et accessible.

---

## 2. Features (Fonctionnalités)

### 2.1. Saisie d’URL YouTube

* Champ de saisie permettant de coller une URL YouTube.
* Placeholder affichant un exemple d’URL valide.
* Auto-focus du champ à l’ouverture de l’application.
* Validation : l’URL doit correspondre à une vidéo YouTube valide.
* Chargement automatique de la vidéo si l’URL est valide.
* Lecteur intégré utilisant l’API **YouTube IFrame Player**.

### 2.2. Lecture vidéo

* La vidéo est affichée via l’API IFrame.
* Contrôles natifs YouTube disponibles : lecture, pause, volume, plein écran.
* Ne pas redévelopper ces contrôles.
* Ajout progressif de fonctions spécifiques (boucle, vitesse).

### 2.3. Définition d’une boucle

* L’utilisateur définit deux bornes temporelles (start / end en secondes).
* Lecture automatique en boucle entre ces bornes.
* Limitation V1 : une seule boucle active possible.
* Évolution future : gestion de plusieurs segments/favoris.
* Bouton dédié Play/Stop pour activer/désactiver la boucle.

**UX spécifiques :**

* Timeline interactive avec deux poignées (start/end).
* Feedback immédiat : affichage du temps au-dessus des poignées.
* Actions rapides : boutons “Set start” et “Set end” basés sur la position courante.
* Indicateur visuel : zone colorée sur la timeline.
* État explicite : label ou icône claire (*Loop ON*) quand la boucle est active.

### 2.4. Contrôle de vitesse

* Presets rapides : 0.5x, 0.75x, 1x.
* Options avancées : autres vitesses disponibles via menu déroulant (0.25x → 1.0x).
* Feedback immédiat : affichage de la vitesse en cours (ex. 0.75x).

### 2.5. Ergonomie pour instrumentistes

* Interface claire et intuitive.
* Écran minimaliste (URL + vidéo + 3–4 boutons essentiels).
* Boutons tactiles ≥ 44px, espacés.
* Optimisation pour orientation paysage (tablette posée à côté de l’instrument).

### 2.6. Interface responsive

* Mobile-first.
* Adaptabilité sur toutes tailles d’écran.
* Contrôles optimisés pour interactions tactiles.
* Layout adapté portrait/paysage.

### 2.7. Accessibilité

* Couleurs contrastées pour lisibilité en environnement lumineux.
* Icônes toujours accompagnées d’un label.
* Navigation clavier.

---

## 3. Non-functional requirements

### 3.1. UX

* Temps de chargement : < 3 secondes pour premier affichage.
* Réactivité : < 100 ms pour toute action utilisateur.
* Ergonomie : maximum 3 clics pour créer une boucle.

### 3.2. Code & Architecture

* Code maintenable et le plus simple possible.
* Découpage clair en composants Angular.
* Pas de logique inutilement complexe.
* Respect des bonnes pratiques Angular.
* Préparer l’architecture pour multi-loops/favoris (sans sur-ingénierie).

### 3.3. Contraintes YouTube

* Respect des quotas Google API.
* Gestion des vidéos privées ou indisponibles avec message d’erreur clair.
* Signalement des cas de géo-blocking.

### 3.4. Technique

* Framework : Angular 19.2 (standalone components).
* Styling : SCSS.
* Backend : aucun (application cliente uniquement).
* Persistance : localStorage.
* Build : Angular CLI moderne avec application builder.

---

## 4. Acceptance Criteria

### 4.1. Saisie d’URL

* AC1 : Si l’URL est invalide, un message d’erreur est affiché.
* AC2 : Si l’URL est valide, la vidéo est chargée et affichée automatiquement.
* AC3 : Le champ est auto-focus à l’ouverture de l’application.
* AC4 : Le placeholder affiche un exemple d’URL YouTube valide.

### 4.2. Lecture vidéo

* AC5 : La vidéo est affichée via l’API IFrame.
* AC6 : Les contrôles natifs YouTube (lecture, pause, volume, plein écran) fonctionnent normalement.
* AC7 : Aucun contrôle natif n’est redéveloppé.

### 4.3. Boucle

* AC8 : L’utilisateur peut définir un start et un end (via champ ou boutons rapides).
* AC9 : La vidéo redémarre automatiquement au temps *start* après avoir atteint *end*.
* AC10 : L’état de la boucle est visible via un indicateur (*Loop ON*).
* AC11 : Une seule boucle peut être active à la fois.

### 4.4. Contrôle de vitesse

* AC12 : L’utilisateur peut régler la vitesse avec les boutons presets (0.5x, 0.75x, 1x).
* AC13 : Les autres vitesses sont accessibles via un menu déroulant.
* AC14 : La vitesse courante est affichée à l’écran.
* AC15 : L’application s’adapte à différentes tailles d’écran (mobile, tablette, desktop).

### 4.5. Ergonomie & responsive

* AC16 : Les boutons tactiles ont une taille ≥ 44px et sont espacés.
* AC17 : Le layout fonctionne en orientation portrait et paysage.

### 4.6. Accessibilité

* AC18 : Les couleurs respectent un contraste suffisant.
* AC19 : Chaque bouton combine une icône et un label.
* AC20 : La navigation au clavier est possible (tabulation).