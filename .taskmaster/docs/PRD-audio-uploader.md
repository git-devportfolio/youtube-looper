# PRD - Module Audio Looper

## 1. Objectif

Développer un nouveau module "Audio Looper" permettant aux utilisateurs d'importer et de manipuler leurs propres fichiers audio (MP3, WAV, etc.) directement dans l'application Angular existante.

Le module doit offrir les fonctionnalités suivantes :
- **Upload de fichiers audio** depuis l'ordinateur de l'utilisateur
- **Modification de la tonalité** (pitch shifting en demi-tons, ± 6 demi-tons)
- **Ajustement de la vitesse de lecture** (sans altérer la tonalité)
- **Lecture en boucle** d'un segment personnalisé (points A/B)
- **Contrôle du volume**

## 2. Contexte

L'application YouTube Looper existe déjà dans cette solution et permet de :
- Charger une vidéo YouTube via URL
- Boucler un segment vidéo (définition de bornes start/end)
- Ajuster la vitesse de lecture
- Interface responsive et épurée

Le nouveau module **Audio Looper** viendra en **complément** du module YouTube Looper. Il sera accessible via un **système de navigation par onglets ou boutons** permettant de basculer entre :
- Module "YouTube Looper" (existant)
- Module "Audio Looper" (nouveau)

Les deux modules partagent des concepts similaires (boucle A/B, vitesse, timeline) mais opèrent sur des sources différentes :
- YouTube Looper : vidéos en ligne
- Audio Looper : fichiers audio locaux

## 3. Fonctionnalités principales

### 3.1 Upload de fichier audio

**Description** : L'utilisateur peut importer un fichier audio depuis son ordinateur.

**Comportement attendu** :
- Zone de drop (drag & drop) + bouton "Parcourir"
- Formats supportés : MP3, WAV, OGG, M4A
- Taille maximale : 10 Mo (10 485 760 octets)
- Validation du format fichier avant chargement
- Affichage du nom du fichier chargé
- **Génération automatique du waveform** : Dès qu'un fichier est chargé avec succès, un graphique de forme d'onde du son (waveform) est généré et affiché visuellement
- Message d'erreur clair si format non supporté ou fichier trop volumineux

### 3.2 Lecture audio

**Description** : L'utilisateur peut lire, mettre en pause, et naviguer dans le fichier audio.

**Comportement attendu** :
- Bouton Play/Pause
- Affichage du temps courant / durée totale (format MM:SS)
- **Navigation directement sur la forme d'onde** : l'utilisateur peut cliquer sur l'onde audio pour se positionner à un instant précis
- **Curseur de lecture** : une ligne verticale se déplace sur l'onde audio pour indiquer la position courante de lecture
- L'onde audio est suffisamment grande et tactile pour une utilisation confortable sur mobile

### 3.3 Définition de boucle (points A/B)

**Description** : L'utilisateur peut définir deux points (A et B) pour boucler une section spécifique du morceau.

**Comportement attendu** :
- Boutons "Set A" et "Set B" pour capturer la position courante
- **Affichage visuel des points A et B directement sur la forme d'onde** : marqueurs colorés superposés à l'onde audio
- **Zone colorée entre A et B sur la forme d'onde** : la section bouclée est visuellement mise en évidence sur l'onde audio
- Bouton "Loop ON/OFF" pour activer/désactiver la lecture en boucle
- Pendant la lecture en boucle :
  - La lecture saute automatiquement de B vers A
  - Indicateur visuel "Loop Active"
  - La zone de boucle reste visuellement distincte sur l'onde audio
- Possibilité de réinitialiser A et B (bouton "Reset Loop")

### 3.4 Modification de la tonalité (Pitch Shift)

**Description** : L'utilisateur peut modifier la tonalité du morceau en demi-tons.

**Comportement attendu** :
- Slider ou input numérique : plage de -6 à +6 demi-tons
- Affichage de la valeur courante (ex. "+3 demi-tons", "-5 demi-tons")
- Application en temps réel pendant la lecture
- Bouton "Reset Pitch" pour revenir à 0

### 3.5 Ajustement de la vitesse

**Description** : L'utilisateur peut ralentir ou accélérer la lecture sans altérer la tonalité.

**Comportement attendu** :
- **Presets rapides** : Trois boutons d'accès rapide (0.5x, 0.75x, 1.0x) pour les valeurs les plus courantes
- **Stepper de vitesse** : Composant stepper [ - | valeur | + ] permettant :
  - Ajustement précis de la vitesse par incréments de 0.1x
  - Plage disponible : 0.4x à 2.0x
  - Boutons - et + pour diminuer/augmenter la vitesse
  - Affichage de la valeur courante au centre (ex. "0.6x", "1.2x")
  - Clic sur les boutons presets rapides met à jour automatiquement le stepper
- Vitesse par défaut : 1.0x (vitesse normale)
- Affichage de la vitesse courante (ex. "1.0x")
- Application en temps réel

### 3.6 Contrôle du volume

**Description** : L'utilisateur peut ajuster le volume de lecture.

**Comportement attendu** :
- Slider de volume (0% à 100%)
- Icône volume muet/actif
- Bouton mute/unmute

## 4. UX / UI attendue

### 4.1 Principes de design

- **L'onde audio comme composant central** : La forme d'onde (waveform) est l'élément graphique principal remplaçant la timeline traditionnelle
- **Upload centré en mode vide** : Quand aucun fichier n'est chargé, le composant d'upload est centré verticalement et horizontalement pour inviter l'utilisateur à cette action primordiale
- **Révélation progressive** : Après chargement réussi, l'interface révèle progressivement l'onde audio et les contrôles
- **Cohérence visuelle** : Réutiliser les styles CSS existants du module YouTube Looper
- **Minimalisme** : Interface épurée, focus sur l'onde audio et les contrôles essentiels
- **Boutons textuels uniquement** : Tous les boutons de contrôle sont textuels sans icônes (sauf exceptions spécifiques comme le bouton volume avec 🔊/🔇)
- **Hiérarchie visuelle dynamique** :
  - **Avant upload** : Zone d'upload centrée (point focal unique)
  - **Après upload** :
    1. Onde audio au centre (composant principal et interactif)
    2. Contrôles de lecture autour de l'onde
    3. Contrôles avancés (pitch, speed, volume) en dessous
- **Feedback immédiat** : Tous les indicateurs visuels (curseur de lecture, points A/B, zone de boucle) sont superposés directement sur l'onde audio
- **Touch-friendly** : Onde audio dimensionnée et optimisée pour une interaction tactile confortable sur mobile
- **Responsive** : Layout adaptatif mobile/desktop avec l'onde audio toujours bien visible
- **Boutons sans icônes** : Les boutons de contrôle (Set A, Set B, Loop ON/OFF, Reset Loop, Reset Pitch, presets de vitesse) affichent uniquement du texte, pas d'icônes

### 4.2 Layout proposé

**État initial (pas de fichier chargé)** :
```
┌─────────────────────────────────────────────────┐
│  [YouTube Looper] [Audio Looper] ← Navigation │
├─────────────────────────────────────────────────┤
│                                                 │
│                                                 │
│           ┌───────────────────────────┐         │
│           │                           │         │
│           │  🎵 Drag & Drop Files     │         │
│           │     or                    │         │
│           │  [Browse Files]           │         │
│           │                           │         │
│           │  MP3, WAV, OGG, M4A       │         │
│           │  Max 10 MB                │         │
│           │                           │         │
│           └───────────────────────────┘         │
│                                                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

**État fichier chargé** :
```
┌─────────────────────────────────────────────────┐
│  [YouTube Looper] [Audio Looper] ← Navigation │
├─────────────────────────────────────────────────┤
│                                                 │
│  📄 my-song.mp3                 [Change File]   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  │  ▁▂▃▅▇█▇▅▃▂▁▂▃▅▇█▇▅▃▂▁▁▂▃▅▇█▇▅▃▂▁      │   │
│  │         │   A════════B                 │   │
│  │         ▼ (curseur lecture)            │   │
│  │         00:45                          │   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [▶ Play]  00:45 / 03:30                       │
│                                                 │
│  Loop: [Set A] [Set B] [🔁 Loop ON] [Reset]    │
│                                                 │
│  Pitch: [-6 ←─────0─────→ +6] (0 semitones)   │
│                                                 │
│  Speed: [0.5x] [0.75x] [1.0x]                  │
│         [ - | 1.0x | + ]  (stepper: 0.4-2.0x)  │
│                                                 │
│  Volume: [🔊 ──────75%──────] [🔇]             │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 4.3 États et interactions

**État initial (pas de fichier chargé)** :
- **Zone d'upload centrée** : Positionnée au centre vertical et horizontal de l'écran
- **Point focal unique** : Seul élément visible pour guider l'utilisateur vers l'action d'upload
- **Navigation** : Toujours visible en haut
- Aucun autre contrôle n'est visible

**État chargement en cours** :
- Indicateur de progression (loader/spinner)
- Message "Génération de la forme d'onde..."
- Zone d'upload reste visible mais désactivée

**État fichier chargé** :
- **Animation de révélation** : L'onde audio apparaît progressivement du centre
- **Zone d'upload minimisée** : Se déplace en haut avec option "Change File"
- **Nom du fichier affiché** en haut à gauche
- **Onde audio visible** : Occupe la zone centrale principale
- Tous les contrôles apparaissent progressivement

**État lecture en cours** :
- Bouton Play → Pause
- **Curseur de lecture** : Ligne verticale animée se déplaçant sur l'onde audio en temps réel
- Temps courant mis à jour dynamiquement
- L'onde audio reste le point focal visuel

**État boucle active** :
- **Zone colorée A-B** : Segment de l'onde audio entre les points A et B visuellement mis en évidence (overlay coloré)
- **Marqueurs A et B** : Lignes verticales colorées distinctes sur l'onde
- Bouton Loop passe à "Loop ON" avec indicateur visuel (ex. couleur active)
- Badge "🔁 Loop Active" visible
- La lecture saute automatiquement de B à A

**État interaction tactile (mobile)** :
- Onde audio avec zone tactile large (min 48px de hauteur)
- Feedback visuel au touch (highlight de la zone touchée)
- Curseur suit le doigt lors du drag
- Points A/B peuvent être déplacés par drag sur mobile

**État erreur** :
- Message d'erreur clair et centré
- Exemples : "Format non supporté", "Fichier trop volumineux", "Erreur de chargement"
- Bouton "Réessayer" pour revenir à l'état initial
- L'upload reste accessible

## 5. Contraintes techniques

### 5.1 Stack technique

- **Framework** : Angular 19.2 (standalone components)
- **Audio processing** : Tone.js (pour pitch shift, time stretch, boucle)
- **Waveform visualization** : Canvas API ou bibliothèque dédiée (ex. wavesurfer.js compatible avec Tone.js)
- **Styling** : SCSS (styles existants de l'application)
- **Architecture** : Standalone components, signals, reactive patterns
- **Persistance** : localStorage (optionnel, pour sauvegarder les préférences utilisateur)

### 5.2 Technologies interdites

- Aucun framework CSS externe (Bootstrap, Material, Tailwind, etc.)
- Aucun backend requis (100% front-end)

### 5.3 Compatibilité

- **Navigateurs** : Chrome, Firefox, Safari, Edge (dernières versions)
- **Responsive** : Desktop (1920×1080 à 1280×720), Tablet (768×1024), Mobile (375×667 à 414×896)
- **Performances** :
  - Chargement fichier < 2 secondes pour 10 MB
  - Génération waveform < 1 seconde
  - Application des effets en temps réel sans latence perceptible
  - Animation fluide du curseur de lecture (60 FPS)

### 5.4 Limites

- Taille maximale fichier : 10 Mo (10 485 760 octets)
- Formats audio supportés : MP3, WAV, OGG, M4A
- Plage pitch shift : -6 à +6 demi-tons
- Vitesse :
  - Presets rapides : 0.5x, 0.75x, 1.0x
  - Stepper : 0.4x à 2.0x avec incréments de 0.1x

## 6. Critères d'acceptation

### 6.1 Navigation entre modules

- ✅ Un système de navigation (onglets ou boutons) permet de basculer entre "YouTube Looper" et "Audio Looper"
- ✅ Le module Audio Looper s'affiche dans un écran distinct
- ✅ La navigation est fluide, sans rechargement de page

### 6.2 Upload de fichier

- ✅ L'utilisateur peut importer un fichier audio via drag & drop ou bouton "Parcourir"
- ✅ Les formats MP3, WAV, OGG, M4A sont acceptés
- ✅ Un message d'erreur s'affiche si le format est non supporté ou si le fichier dépasse 10 MB
- ✅ Le nom du fichier chargé est affiché
- ✅ Un graphique de forme d'onde (waveform) est automatiquement généré et affiché dès qu'un fichier est chargé avec succès
- ✅ **En mode vide (pas de fichier), la zone d'upload est centrée verticalement et horizontalement**
- ✅ **Après chargement réussi, l'interface révèle l'onde audio et les contrôles avec une transition fluide**

### 6.3 Lecture audio

- ✅ Bouton Play/Pause fonctionnel
- ✅ Temps courant et durée totale affichés au format MM:SS
- ✅ **L'onde audio est le composant central et principal de l'interface**
- ✅ **Un curseur de lecture (ligne verticale) se déplace sur l'onde audio en temps réel**
- ✅ **Clic sur l'onde audio permet de se positionner à un instant précis**
- ✅ **L'onde audio est suffisamment grande pour une interaction tactile confortable sur mobile (min 48px hauteur)**

### 6.4 Boucle A/B

- ✅ Boutons "Set A" et "Set B" capturent la position courante
- ✅ **Les points A et B sont affichés visuellement directement sur la forme d'onde** (marqueurs colorés superposés)
- ✅ **La zone entre A et B est colorée directement sur la forme d'onde** (overlay visuel sur l'onde)
- ✅ Le bouton "Loop ON/OFF" active/désactive la boucle
- ✅ Pendant la lecture en boucle, la lecture saute automatiquement de B vers A
- ✅ Un indicateur visuel "Loop Active" est affiché quand la boucle est activée
- ✅ Bouton "Reset Loop" réinitialise A et B

### 6.5 Modification de la tonalité

- ✅ Slider ou input numérique permet de modifier le pitch de -6 à +6 demi-tons
- ✅ La valeur courante est affichée (ex. "+3 semitones")
- ✅ Le changement de tonalité est appliqué en temps réel pendant la lecture
- ✅ Bouton "Reset Pitch" ramène la tonalité à 0

### 6.6 Ajustement de la vitesse

- ✅ Boutons presets 0.5x, 0.75x, 1.0x fonctionnels pour accès rapide
- ✅ Stepper de vitesse [ - | valeur | + ] fonctionnel :
  - Plage : 0.4x à 2.0x
  - Incréments de 0.1x
  - Boutons - et + ajustent la vitesse
  - Affichage de la valeur courante au centre
  - Synchronisation avec les boutons presets
- ✅ La vitesse par défaut au chargement est 1.0x (vitesse normale)
- ✅ La vitesse courante est affichée (ex. "0.5x", "0.6x", "1.2x")
- ✅ Le changement de vitesse est appliqué en temps réel sans altérer la tonalité

### 6.7 Contrôle du volume

- ✅ Slider de volume permet de régler le volume de 0% à 100%
- ✅ Bouton mute/unmute fonctionnel
- ✅ Icône volume change selon l'état (muet/actif)

### 6.8 Interface responsive

- ✅ L'interface s'adapte correctement sur desktop, tablette et mobile
- ✅ **L'onde audio reste le composant central et bien visible sur toutes les tailles d'écran**
- ✅ Les contrôles sont utilisables sur écran tactile
- ✅ Le layout reste lisible et ergonomique sur toutes les tailles d'écran

### 6.9 Design et cohérence

- ✅ L'interface utilise les styles SCSS existants de l'application
- ✅ Le design est cohérent avec le module YouTube Looper
- ✅ L'interface est épurée et minimaliste
- ✅ Les états (erreur, chargement, actif, inactif) sont visuellement clairs
- ✅ **L'expérience utilisateur est centrée sur l'onde audio comme élément principal**
- ✅ Tous les boutons de contrôle sont textuels sans icônes (sauf volume avec 🔊/🔇)

### 6.10 Performances

- ✅ Le chargement d'un fichier de 10 MB prend moins de 2 secondes
- ✅ La génération de la forme d'onde prend moins de 1 seconde
- ✅ L'application des effets (pitch, speed) se fait sans latence perceptible
- ✅ La lecture en boucle est fluide, sans coupure audible
- ✅ L'animation du curseur de lecture est fluide (60 FPS)

### 6.11 Gestion des erreurs

- ✅ Messages d'erreur clairs et explicites
- ✅ L'application ne plante pas en cas d'erreur de chargement
- ✅ L'utilisateur est guidé en cas de format non supporté ou fichier trop volumineux

---

## Notes pour l'implémentation

### Principe de développement itératif

**IMPORTANT** : Chaque tâche/sous-tâche doit être :
- **Testable manuellement** : L'application doit compiler et être fonctionnelle après chaque tâche
- **Validable par l'utilisateur** : Chaque étape doit pouvoir être testée en lançant `npm start`
- **Incrémentale** : Chaque livrable ajoute une fonctionnalité visible et testable
- **Sans régression** : Les fonctionnalités précédentes doivent continuer à fonctionner

**Workflow de validation** :
1. Implémenter la tâche
2. Lancer `npm run build` pour vérifier qu'il n'y a pas d'erreurs de compilation
3. Lancer `npm start` pour tester manuellement la fonctionnalité
4. Valider que la fonctionnalité fonctionne comme attendu
5. Passer à la tâche suivante uniquement après validation

### Découpage en tâches suggéré

1. **Mise en place de la navigation** entre modules YouTube Looper et Audio Looper
2. **Création du composant Audio Looper** (structure de base avec layout centré)
3. **Intégration de Tone.js** et configuration du player audio
4. **Upload de fichier** (drag & drop + validation + layout centré en mode vide)
5. **Génération et affichage de la forme d'onde** (waveform component)
6. **Lecteur audio de base** (play/pause, curseur de lecture sur waveform)
7. **Navigation sur le waveform** (clic pour se positionner)
8. **Boucle A/B** (marqueurs et zone colorée sur le waveform)
9. **Contrôle de la tonalité** (pitch shift avec Tone.js)
10. **Contrôle de la vitesse** (time stretch avec Tone.js)
11. **Contrôle du volume**
12. **Responsive et polish UI** (optimisation tactile mobile)
13. **Animations et transitions** (révélation progressive de l'interface)
14. **Tests manuels et corrections**
15. **(Optionnel) Export du fichier traité**

### Dépendances NPM à installer

```bash
npm install tone
npm install --save-dev @types/tone
# Option pour waveform : wavesurfer.js ou utiliser Canvas API natif
npm install wavesurfer.js
```

### Références Tone.js

- **Pitch Shift** : `Tone.PitchShift`
- **Time Stretch (vitesse sans changement de tonalité)** : `Tone.Player` avec `playbackRate` combiné à `PitchShift` pour compenser
- **Boucle** : `Tone.Player.setLoopPoints(startTime, endTime)` + `player.loop = true`
- **Volume** : `Tone.Volume` ou `player.volume.value`
- **Waveform** : Utiliser `Tone.Analyser` ou intégrer avec wavesurfer.js

### Architecture Angular suggérée

```
src/app/features/audio-looper/
├── ui/
│   ├── audio-looper-container/
│   │   ├── index.ts
│   │   ├── audio-looper-container.component.ts
│   │   ├── audio-looper-container.component.html
│   │   └── audio-looper-container.component.scss
│   ├── file-upload/
│   │   ├── index.ts
│   │   ├── file-upload.component.ts
│   │   ├── file-upload.component.html
│   │   └── file-upload.component.scss
│   ├── waveform-display/              # Nouveau composant central
│   │   ├── index.ts
│   │   ├── waveform-display.component.ts
│   │   ├── waveform-display.component.html
│   │   └── waveform-display.component.scss
│   ├── audio-player/
│   │   ├── index.ts
│   │   ├── audio-player.component.ts
│   │   ├── audio-player.component.html
│   │   └── audio-player.component.scss
│   ├── loop-controls/
│   │   ├── index.ts
│   │   ├── loop-controls.component.ts
│   │   ├── loop-controls.component.html
│   │   └── loop-controls.component.scss
│   ├── pitch-control/
│   │   └── ...
│   ├── speed-control/
│   │   └── ...
│   ├── volume-control/
│   │   └── ...
│   └── index.ts
├── services/
│   ├── audio-player.service.ts
│   ├── tone-engine.service.ts
│   ├── waveform.service.ts           # Nouveau service pour waveform
│   └── index.ts
└── index.ts
```