# YouTube Looper 🎵

> **Application expérimentale développée avec [Claude Code](https://claude.ai/code) pour explorer le "vibe coding" - développement collaboratif IA-humain en temps réel.**

Une application web responsive développée en Angular pour faciliter l'apprentissage musical en permettant de boucler des segments précis de vidéos YouTube.

![Angular](https://img.shields.io/badge/Angular-19.2-red)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![SCSS](https://img.shields.io/badge/SCSS-Styling-pink)
![Claude Code](https://img.shields.io/badge/Built_with-Claude_Code-purple)
![License](https://img.shields.io/badge/License-MIT-green)

## 🎯 Objectif

YouTube Looper est conçu spécifiquement pour les **musiciens** et **étudiants en musique** qui souhaitent :
- Répéter des passages musicaux complexes
- Analyser des techniques instrumentales
- Apprendre à leur rythme avec un contrôle précis de la vitesse
- Créer des boucles parfaites pour l'entraînement

## ✨ Fonctionnalités

### 🎬 Lecteur Vidéo Intégré
- **API YouTube IFrame** : Intégration native avec contrôles YouTube
- **Affichage conditionnel** : Interface progressive qui s'adapte à l'état
- **Animations fluides** : Transitions CSS élégantes en cascade

### 🎛️ Contrôles de Boucle
- **Timeline interactive** : Définition précise des points start/end
- **Contrôles de boucle** : Activation/désactivation en un clic
- **Lecture automatique** : Répétition seamless du segment sélectionné

### ⚡ Contrôle de Vitesse
- **Presets rapides** : 0.45x, 0.5x, 0.7x, 0.75x, 1x
- **Interface simplifiée** : Boutons d'accès direct aux vitesses courantes
- **Optimisé pour l'apprentissage** : Focus sur les vitesses lentes

### 🎨 Interface Utilisateur
- **Design responsive** : Mobile-first, compatible tous écrans
- **Mode sombre/clair** : Adaptation automatique aux préférences
- **Animations CSS** : Transitions fluides et professionnelles
- **Help guide intégré** : Guide pas-à-pas pour les nouveaux utilisateurs

### 🔗 Gestion d'URL
- **Validation intelligente** : Reconnaissance automatique des URLs YouTube
- **Support des timestamps** : Détection automatique des paramètres `t=`
- **Interface épurée** : Saisie simple et feedback visuel immédiat

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 18+
- npm ou yarn
- Angular CLI 19.2+

### Installation

```bash
# Cloner le repository
git clone https://github.com/git-devportfolio/youtube-looper.git
cd youtube-looper

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm start
```

L'application sera accessible sur `http://localhost:4200`

### Scripts Disponibles

```bash
# Développement
npm start                    # Démarre le serveur de dev
ng serve                     # Alternative Angular CLI

# Build
npm run build               # Build de production
ng build --watch            # Build en mode watch

# Tests (si configurés)
ng test                     # Tests unitaires
ng e2e                      # Tests end-to-end
```

## 🏗️ Architecture Technique

### Stack Technologique
- **Framework** : Angular 19.2 avec Standalone Components
- **Langage** : TypeScript avec mode strict
- **Styling** : SCSS avec architecture modulaire
- **API** : YouTube IFrame Player API
- **State Management** : Angular Signals
- **Build** : Angular CLI avec optimisations

### Structure du Projet
```
src/app/
├── core/                   # Services et utilitaires centraux
├── features/
│   ├── layout/            # Composants de layout (header, footer)
│   ├── main-app/          # Composant principal et orchestration
│   ├── player/            # Contrôles de vitesse
│   ├── video-controls/    # Timeline et contrôles vidéo
│   ├── video-player/      # Intégration YouTube Player
│   ├── youtube/           # Composants liés à YouTube (URL input)
│   └── loop/              # Système de boucles
├── shared/
│   ├── services/          # Services partagés (theme, etc.)
│   └── ui/                # Composants UI réutilisables
└── styles/                # Styles globaux et variables
```

### Patterns Architecturaux
- **Standalone Components** : Architecture moderne sans NgModules
- **Feature-based** : Organisation modulaire par fonctionnalité
- **Barrel Exports** : Imports propres avec fichiers index.ts
- **Signal-based State** : Gestion d'état réactive moderne
- **CSS-only Animations** : Performances optimales sans JS

## 🎵 Guide d'Utilisation

### 1. Charger une Vidéo
1. Coller une URL YouTube dans le champ de saisie
2. La vidéo apparaît automatiquement avec une animation fluide
3. Les contrôles se révèlent progressivement

### 2. Créer une Boucle
1. Utiliser la timeline pour définir les points start/end
2. Activer la boucle avec le bouton dédié
3. Ajuster la vitesse selon vos besoins

### 3. Optimiser l'Apprentissage
- Commencer à vitesse réduite (0.5x ou 0.75x)
- Répéter le passage jusqu'à maîtrise
- Augmenter progressivement la vitesse
- Utiliser le guide d'aide pour découvrir toutes les fonctionnalités

## 📁 Directives et Configuration Claude Code

Ce projet utilise plusieurs fichiers de directives pour optimiser le développement collaboratif avec Claude Code :

### 🎯 **Fichiers de Directives Principales**
- **`CLAUDE.md`** : Instructions contextuelles et conventions de développement
- **`.taskmaster/`** : Configuration et tâches pour Task Master AI
- **`.ai/`** : Directives spécialisées et bonnes pratiques Angular

### 🔧 **Configuration Claude Code**
- **Standalone Components** : Architecture moderne sans NgModules
- **Feature-based Structure** : Organisation modulaire claire
- **Barrel Exports** : Imports propres avec index.ts
- **Signal-based State** : Gestion d'état réactive
- **CSS-only Animations** : Performances optimisées

### 📋 **Conventions Établies**
- **TypeScript strict** : Mode strict pour la qualité du code
- **SCSS obligatoire** : Styling structuré et maintenable
- **Mobile-first** : Design responsive par défaut
- **Commits atomiques** : Une fonctionnalité par commit
- **Documentation vivante** : Synchronisation code/documentation

### 🎨 **Patterns de Développement**
- **Component Architecture** : Structure modulaire et réutilisable
- **Service Injection** : Utilisation de la fonction `inject()`
- **Control Flow** : Syntaxe moderne `@if`, `@for`, `@switch`
- **Reactive Forms** : Gestion des formulaires avec validation
- **CSS Custom Properties** : Thèmes et variables cohérents

## 🔧 Configuration

### Variables d'Environnement
L'application fonctionne entièrement côté client sans backend requis.

### Personnalisation des Thèmes
Les thèmes sont gérés via CSS custom properties dans `src/styles/`:
- `variables.scss` : Variables globales
- `themes.scss` : Définitions des thèmes clair/sombre

## 📱 Compatibilité

### Navigateurs Supportés
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### Résolutions d'Écran
- Mobile : 320px - 767px
- Tablet : 768px - 1023px
- Desktop : 1024px+

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/ma-fonctionnalite`)
3. Commit les changements (`git commit -m 'feat: ma nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/ma-fonctionnalite`)
5. Ouvrir une Pull Request

## 📄 License

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🤖 Développement avec Claude Code

Cette application a été développée en **"vibe coding"** avec [Claude Code](https://claude.ai/code), explorant les possibilités du développement collaboratif IA-humain :

### 🎯 **Expérimentation "Vibe Coding"**
- **Développement itératif** : Cycles courts de développement en temps réel
- **Architecture émergente** : Évolution organique de la structure du code
- **Pair programming IA-humain** : Collaboration continue entre développeur et IA
- **Feedback immédiat** : Ajustements et améliorations en direct

### 🛠️ **Méthodologie Utilisée**
- **Task Master AI** : Découpage intelligent des tâches de développement
- **Commits atomiques** : Chaque fonctionnalité committée séparément
- **Refactoring continu** : Amélioration permanente de la qualité du code
- **Documentation vivante** : README et code maintenus en synchronisation

### 📈 **Résultats de l'Expérience**
- **Architecture moderne** : Standalone Components, Signals, CSS-only animations
- **Code maintenable** : Structure claire, patterns cohérents
- **UX fluide** : Animations et transitions soignées
- **Développement rapide** : Fonctionnalités complexes implémentées efficacement

## 🙏 Remerciements

- **[Claude Code](https://claude.ai/code)** pour cette expérience de développement collaborative innovante
- **Angular Team** pour le framework exceptionnel
- **YouTube** pour l'API IFrame Player
- **Communauté Open Source** pour les outils et inspirations

---

**Développé avec ❤️ et 🤖 pour la communauté musicale**

*YouTube Looper - Une expérience de "vibe coding" avec Claude Code*