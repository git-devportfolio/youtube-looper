# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Développer une **application web responsive en Angular** permettant de **boucler un segment précis d'une vidéo YouTube ou d'un fichier audio local** afin de faciliter le travail instrumental (ex. guitare).
L'objectif est de fournir un outil **simple, efficace et ergonomique** pour répéter en boucle un passage musical.

L'application se compose de deux modules complémentaires :
1. **YouTube Looper** : Lecture et bouclage de vidéos YouTube en ligne
2. **Audio Looper** : Lecture et bouclage de fichiers audio locaux avec contrôle avancé (pitch, vitesse, volume)

## Fonctionnalités principales

## Module YouTube Looper (existant)

### 1. Saisie d'URL YouTube

* **Champ de saisie** : L’utilisateur peut coller une URL de vidéo YouTube.
* **Placeholder** : Un exemple d’URL YouTube est affiché pour guider l’utilisateur.
* **Auto-focus** : Au lancement de l’application, le curseur est automatiquement positionné dans le champ.
* **Validation** : Vérification que l’URL saisie correspond bien à une vidéo YouTube valide.
* **Chargement automatique** : Si l’URL est valide, la vidéo est immédiatement intégrée et affichée.
* **Lecteur intégré** : La vidéo est rendue via l’API YouTube IFrame Player.

### 2. Lecture vidéo

* La vidéo est affichée avec les contrôles natifs YouTube (lecture, pause, volume, plein écran, etc.).
* Ne pas redévelopper ces contrôles : ils sont fournis par l’API IFrame.
* Approche progressive : en plus des contrôles natifs, seuls les éléments essentiels spécifiques à l’app sont ajoutés (boucle, vitesse).

### 3. Définition d’une boucle

* **Bornes temporelles** : L’utilisateur définit deux bornes (start / end en secondes).
* **Lecture en boucle** : La vidéo joue automatiquement en boucle entre ces bornes.
* **Limitation V1** : Une seule boucle active possible.
* **Évolution prévue** : Gestion de plusieurs segments/favoris (ne pas le prévoir dans la verion 1 de l'application).
* **Lecture en boucle** : Bouton dédié Play/Stop pour activer/désactiver la boucle.

#### UX spécifiques

* **Timeline interactive** : Slider avec deux poignées “start” et “end”.
* **Feedback immédiat** : Affichage du temps choisi au-dessus des poignées.
* **Actions rapides** : Boutons “Set start” et “Set end” pour enregistrer directement la position courante.
* **Indicateur visuel** : Zone colorée sur la timeline pour montrer le segment bouclé.
* **État explicite** : Label ou icône claire (ex. *Loop ON*) quand la boucle est active.

### 4. Contrôle de vitesse (ralenti)

* **Presets rapides** : Trois boutons principaux (0.5x, 0.75x, 1x).
* **Options avancées** : Valeurs supplémentaires accessibles via un menu déroulant.
* **Feedback immédiat** : Affichage de la vitesse en cours près du lecteur (ex. 0.75x).

### 5. Ergonomie pour instrumentistes

* **Contrôles simples** : Interface claire et intuitive.
* **Minimalisme** : Écran épuré (URL + vidéo + 3 à 4 boutons essentiels).

### 6. Interface responsive

* **Mobile First** : Optimisation pour smartphones et tablettes.
* **Adaptabilité** : Compatible toutes tailles d’écran.
* **Touch-friendly** : Contrôles optimisés pour interactions tactiles.
* **Orientation** : Layout adapté en mode portrait et paysage.

### 7. Accessibilité

* **Contrastes élevés** : Lisible même en environnement lumineux (ex. salle de répétition).
* **Icônes + texte** : Associer systématiquement icône et label ("Loop", "Speed").
* **Support accessibilité** : Navigation clavier.

## Module Audio Looper (nouveau)

Le module Audio Looper permet l'upload et la manipulation de fichiers audio locaux avec des fonctionnalités avancées de contrôle audio.

### Fonctionnalités clés

1. **Upload de fichiers audio**
   - Formats supportés : MP3, WAV, OGG, M4A
   - Taille maximale : 10 Mo (10 485 760 octets)
   - Interface drag & drop + bouton parcourir
   - Upload centré en mode vide (avant chargement)

2. **Visualisation waveform**
   - Forme d'onde audio comme composant central de l'interface
   - Navigation directe sur la waveform (clic pour positionner)
   - Curseur de lecture animé sur la waveform
   - Marqueurs A/B et zone de boucle superposés sur la waveform

3. **Lecture audio**
   - Contrôles Play/Pause
   - Affichage temps courant / durée totale (MM:SS)
   - Interaction tactile optimisée

4. **Boucle A/B**
   - Boutons "Set A" et "Set B" pour définir les bornes
   - Bouton "Loop ON/OFF" pour activer/désactiver
   - Marqueurs visuels A et B sur la waveform
   - Zone colorée entre A et B
   - Bouton "Reset Loop"

5. **Modification de la tonalité (Pitch Shift)**
   - Plage : -6 à +6 demi-tons
   - Slider avec affichage de la valeur courante
   - Application en temps réel
   - Bouton "Reset Pitch"

6. **Ajustement de la vitesse**
   - Presets : 0.5x, 0.75x, 1.0x uniquement
   - Vitesse par défaut : 1.0x
   - Sans altération de la tonalité
   - Affichage de la vitesse courante

7. **Contrôle du volume**
   - Slider de volume (0% à 100%)
   - Bouton mute/unmute avec icônes 🔊/🔇

### Technologies Audio Looper

- **Audio processing** : Tone.js (pitch shift, time stretch, boucle)
- **Waveform visualization** : Canvas API ou wavesurfer.js
- **Architecture** : `src/app/features/audio-looper/`

### Design Audio Looper

- **Boutons textuels uniquement** : Tous les boutons de contrôle sans icônes (sauf volume)
- **Waveform central** : Élément graphique principal de l'interface
- **Révélation progressive** : Interface révèle progressivement les contrôles après upload
- **Minimalisme** : Interface épurée centrée sur l'onde audio

### Navigation entre modules

- Système de navigation (onglets ou boutons) pour basculer entre YouTube Looper et Audio Looper
- Navigation fluide sans rechargement de page
- Chaque module s'affiche dans un écran distinct

## Contraintes YouTube

* Respect des quotas Google API.
* Gestion des vidéos privées ou indisponibles : affichage d’un message d’erreur clair.
* Géo-blocking : signaler si la vidéo est non disponible dans la région.

## Public cible

* Guitaristes débutants à avancés.
* Musiciens voulant analyser des morceaux.
* Professeurs de musique pour créer des exercices.
* Étudiants en conservatoire ou autodidactes.

## UI / UX

* **UI** : Mode sombre/clair, minimaliste, design épuré, pas de surcharge visuelle.
* **UX** : Intuitive, ergonomique, fluide.
* Focus exclusif sur la lecture et boucle vidéo (pas de fonctionnalités secondaires à ce stade).

## Code & Architecture

* Code **maintenable** et **le plus simple possible** :
  * Découpage clair en composants Angular.
  * Pas de logique inutilement complexe.
  * Respect des bonnes pratiques Angular.
* Préparer l’architecture pour les futures évolutions (multi-loops, favoris) **sans sur-ingénierie**.

## Méthodologie (Claude Code + TaskManager AI)

* **Découpage itératif** : chaque fonctionnalité est une tâche indépendante et testable.
* **Livrables incrémentaux** : chaque tâche doit livrer une version **fonctionnelle immédiatement testable**.
* **Pour chaque sous tâches TaskMaster AI** : lancer un build de l'application pour contrôler les erreurs
* **Human-in-the-loop** :
  * La chaîne est **bloquée après chaque sous tâche**.
  * Un **test manuel** valide la fonctionnalité avant de continuer.
  * Objectif : feedback rapide, corrections immédiates, éviter d’accumuler les erreurs.

## Exemple de séquencement des tâches

1. Initialisation du projet Angular (**youtube-looper**).
2. Création du squelette UI (header/footer minimalistes, mode sombre/).
3. Intégration du champ de saisie d’URL YouTube.
4. Affichage de la vidéo via l’API IFrame (avec contrôles natifs).
5. Ajout de la sélection d’une boucle (start/end).
6. Lecture en boucle d’un segment unique.
7. Intégration du contrôle de vitesse (0.5x → 1.0x).
8. Amélioration de l’UX (boutons ergonomiques, responsive design).
9. Validation finale et optimisation.
10. (Préparation future) Conception de l’extension multi-loops / favoris.

- **Technologie**: Angular 19.2 avec architecture standalone components
- **Styling**: SCSS obligatoire
- **Backend**: Aucun - application cliente uniquement
- **Persistance**: localStorage
- **Architecture**: Moderne Angular CLI avec application builder

## Fonctionnalités Principales Globales

### Module YouTube Looper
- Lecture de vidéos YouTube intégrées avec l'utilisation de Youtube API IFrame
- Création et gestion d'une liste de boucles sur des segments de la vidéo chargée
- Interface responsive
- Pas de tests à générer

### Module Audio Looper
- Upload et lecture de fichiers audio locaux (MP3, WAV, OGG, M4A)
- Visualisation waveform interactive
- Contrôle avancé : pitch shift (±6 demi-tons), vitesse (0.5x, 0.75x, 1.0x), volume
- Boucle A/B avec marqueurs visuels sur waveform
- Interface responsive centrée sur la waveform
- Pas de tests à générer

### Spécifications du PRD
Le PRD complet pour le module Audio Looper est disponible dans :
- `.taskmaster/docs/PRD-audio-uploader.md` (sera renommé PRD-audio-looper.md)

## Development Commands

### Core Development
- `npm start` or `ng serve` - Start development server on http://localhost:4200
- `ng build` - Build the project (production optimized by default)
- `ng build --watch --configuration development` - Build in watch mode for development

### Code Generation
- `ng generate component <name>` - Generate new component with SCSS styling
- `ng generate --help` - View all available schematics

#### Création de Composants avec Structure Organisée
Lors de la création d'un nouveau composant, suivre ces étapes :

1. **Créer le dossier du composant :**
```bash
mkdir -p src/app/features/feature-name/ui/component-name
```

2. **Générer le composant dans ce dossier :**
```bash
ng generate component features/feature-name/ui/component-name --skip-tests=true
```

3. **Créer le fichier index.ts :**
```bash
# Dans component-name/index.ts
echo "export { ComponentNameComponent } from './component-name.component';" > src/app/features/feature-name/ui/component-name/index.ts
```

4. **Mettre à jour le fichier index.ts parent :**
```typescript
// Dans ui/index.ts - ajouter la ligne
export * from './component-name';
```

#### Bonnes Pratiques de Nommage
- **Dossiers :** kebab-case (`video-player`, `player-controls`)  
- **Composants :** PascalCase (`VideoPlayerComponent`)
- **Fichiers :** kebab-case (`video-player.component.ts`)
- **Index.ts :** Toujours présent dans chaque dossier de composant

## Project Architecture

### Structure
- **Standalone Components**: Uses Angular's standalone component architecture (no NgModules)
- **Routing**: Configured with `provideRouter` in `app.config.ts`
- **Styling**: SCSS is the default styling language
- **TypeScript**: Strict mode enabled with comprehensive compiler options

### Key Configuration
- **Component Prefix**: `app-` (defined in `angular.json`)
- **Source Root**: `src/`
- **Output Path**: `dist/app-youtube-looper/`
- **Assets**: Static assets served from `public/` directory
- **Global Styles**: `src/styles.scss`

### Build Configuration
- **Production**: Optimized builds with output hashing and budgets (500kB warning, 1MB error for initial bundle)
- **Development**: Source maps enabled, optimization disabled for faster builds
- **Component Style Budget**: 4kB warning, 8kB error per component

### TypeScript Configuration
- Strict mode enabled with additional strict options
- ES2022 target and module system
- Bundler module resolution
- Angular-specific strict options enabled (injection parameters, templates, input access modifiers)

## Conventions de Code et Architecture

### Convetion de code
- Utiliser les principes du clean code

### Références Angular
Les conventions de développement Angular sont définies dans :
- `C:/local.dev/labs/angular_lab/youtube-looper/.ai/ng-with-ai/best-practices.md` - Bonnes pratiques Angular
- `C:/local.dev/labs/angular_lab/youtube-looper/.ai/ng-with-ai/instructions.md` - Instructions de développement
- `C:/local.dev/labs/angular_lab/youtube-looper/.ai/ng-with-ai/convention-facade-signals.md` - Conventions facade et signals
- `C:/local.dev/labs/angular_lab/youtube-looper/.ai/ng-with-ai/llms-full.txt` - Guide complet LLMs

### Principes Clés
- **Standalone Components**: Obligatoire, pas de NgModules
- **Templates HTML**: Toujours utiliser des fichiers HTML séparés, jamais de templates inline
- **Signals**: Utiliser pour la gestion d'état locale
- **Control Flow**: Utiliser `@if`, `@for`, `@switch` au lieu des directives structurelles
- **Fonction inject()**: Préférer à l'injection par constructeur
- **Reactive Forms**: Préférer aux Template-driven forms
- **Structure modulaire**: Un composant = un dossier avec tous ses fichiers
- **Index.ts obligatoire**: Utiliser les barrel exports pour exposer l'API publique
- **Imports propres**: Préférer les barrel exports aux chemins de fichiers complets

### Organisation des Composants et Structure des Dossiers

#### Principe de Base
**OBLIGATOIRE**: Chaque composant doit être organisé dans son propre répertoire contenant tous ses fichiers (.ts, .html, .scss, .spec.ts) et un fichier index.ts pour les exports.

#### Structure Recommandée
```
src/app/features/feature-name/ui/
├── component-name/
│   ├── index.ts                           # Barrel export
│   ├── component-name.component.ts        # Logique du composant
│   ├── component-name.component.html      # Template
│   ├── component-name.component.scss      # Styles
└── index.ts                               # Export de tous les composants UI
```

#### Pattern Index.ts (Barrel Exports)
Les fichiers `index.ts` servent de points d'entrée centralisés pour chaque module :

**Fichier index.ts d'un composant :**
```typescript
// component-name/index.ts
export { ComponentNameComponent } from './component-name.component';
export { ComponentNameInterface } from './component-name.component'; // si applicable
```

**Fichier index.ts principal du dossier ui :**
```typescript
// ui/index.ts
export * from './component-1';
export * from './component-2';
export * from './component-3';
```

#### Avantages de cette Organisation

1. **Imports Propres**
```typescript
// ❌ Avant - imports "sales"
import { ComponentA } from './components/component-a/component-a.component';
import { ComponentB } from './components/component-b/component-b.component';

// ✅ Après - imports propres avec barrel exports  
import { ComponentA, ComponentB } from './components';
// ou
import { ComponentA } from './components/component-a';
```

2. **Encapsulation et API Publique**
- Contrôle de ce qui est exposé publiquement
- Masquage des détails d'implémentation interne
- Interface claire entre modules

3. **Facilité de Refactoring**
```typescript
// Si on renomme component-a.component.ts -> component-a-widget.component.ts
// Seul l'index.ts change, les imports externes restent identiques

// component-a/index.ts
export { ComponentA } from './component-a-widget.component'; // ✅ Seul changement nécessaire
```

4. **Maintenance et Évolutivité**
- Structure claire et prévisible
- Ajout facile de nouveaux composants
- Séparation claire des responsabilités
- Navigation plus simple dans le code

#### Règles d'Import SCSS
Avec la structure en sous-répertoires, les imports SCSS doivent être ajustés :
```scss
// Dans component-name/component-name.component.scss
@import '../../../../../styles/mixins'; // Ajuster le nombre de ../ selon la profondeur
```

## Workflow Git et Task Master

### Commits Atomiques par Sous-tâche
**OBLIGATOIRE**: Chaque sous-tâche Task Master DOIT être committée séparément avec un commit atomique :

1. **Une sous-tâche = Un commit** : Chaque sous-tâche Task Master terminée doit faire l'objet d'un commit dédié
2. **Messages de commit descriptifs** : Utiliser le format `feat: implement task X.Y - description courte`
3. **Ordre de commit** :
   - Marquer la sous-tâche comme terminée avec `task-master set-status --id=X.Y --status=done`
   - Ajouter les fichiers modifiés avec `git add`
   - Créer le commit atomique avec un message détaillé
   - Passer à la sous-tâche suivante

4. **Format du message de commit** :
```bash
git commit -m "feat: implémentation tâche X.Y - description courte

Description détaillée des changements:
- Fonctionnalité 1 implémentée
- Amélioration technique 2

Améliorations techniques:
- Détails techniques spécifiques
- Optimisations réalisées

🤖 Généré avec [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

5. **Avantages** :
   - Historique Git clair et traceable
   - Possibilité de revenir sur une sous-tâche spécifique
   - Facilite les reviews de code
   - Respect des bonnes pratiques Git
   - Synchronisation avec le système Task Master

### Bonnes Pratiques Task Master
- Toujours utiliser `task-master set-status` pour marquer les tâches terminées
- Faire des commits atomiques après chaque sous-tâche terminée
- Ne jamais grouper plusieurs sous-tâches dans un même commit
- Utiliser les messages de commit pour documenter les changements techniques

## Task Master AI Instructions
**Utiliser Task Master AI pour découper le projet en tâches. Toutes les spécifications seront dans `.taskmaster/docs/`**
@./.taskmaster/CLAUDE.md
