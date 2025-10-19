# Documentation Audio Looper

Ce dossier contient la documentation technique du module Audio Looper.

## Documents Disponibles

### 1. TECHNICAL_OVERVIEW.md
**Aperçu Technique Complet**

Vue d'ensemble complète de l'architecture, des flux de données, et des optimisations du module Audio Looper.

**Contenu** :
- Stack technologique
- Architecture des services (ToneEngine, RubberbandEngine, Compatibility)
- Composants UI
- Web Worker Rubberband
- Flux de données détaillés
- Optimisations (cache, debounce, throttling, timeout)
- Gestion d'erreurs
- Métriques de performance
- Compatibilité navigateur

**Pour qui** : Développeurs découvrant le projet, nouveaux contributeurs

---

### 2. AUDIO_CONTROLS_SYNC.md
**Synchronisation des Contrôles Audio**

Documentation complète de la synchronisation entre les différents contrôles audio (pitch, vitesse, volume, boucle).

**Contenu** :
- Architecture des contrôles
- Responsabilités de ToneEngineService vs RubberbandEngineService
- Flux de données pour chaque contrôle
- Optimisations (debounce, cache, throttling)
- Tests de synchronisation
- Problèmes connus et solutions

**Pour qui** : Développeurs travaillant sur les contrôles audio

---

### 3. AUDIO_QUALITY_TESTING.md
**Tests de Qualité Audio - Rubberband vs Tone.js**

Guide complet pour effectuer les tests de qualité audio et valider l'amélioration apportée par Rubberband.

**Contenu** :
- Protocole de test détaillé
- Types de fichiers à tester
- Critères d'évaluation (timbre, artefacts, clarté, naturel)
- Grilles de test à remplir
- Tests combinés (pitch + vitesse + boucle)
- Cas d'usage musical
- Checklist de validation

**Pour qui** : QA, testeurs, développeurs validant la qualité

---

## Quick Start

### Pour les Développeurs

1. **Découvrir le projet** → Lire `TECHNICAL_OVERVIEW.md`
2. **Comprendre l'architecture** → Lire `AUDIO_CONTROLS_SYNC.md`
3. **Modifier un contrôle** → Consulter le flux correspondant dans `AUDIO_CONTROLS_SYNC.md`
4. **Tester la qualité** → Suivre le protocole dans `AUDIO_QUALITY_TESTING.md`

### Pour les Testeurs QA

1. **Préparer les fichiers de test** → Voir section "Préparation des Fichiers" dans `AUDIO_QUALITY_TESTING.md`
2. **Exécuter les tests** → Suivre le "Protocole de Test"
3. **Documenter les résultats** → Utiliser les grilles fournies
4. **Rédiger le rapport** → Format fourni dans la documentation

## Architecture Globale

```
Audio Looper Module
├── Services
│   ├── ToneEngineService       (Orchestrateur principal)
│   ├── RubberbandEngineService (Traitement pitch + tempo)
│   ├── AudioPlayerService      (Facade)
│   ├── WaveformService         (Visualisation)
│   └── BrowserCompatibility    (Détection support)
├── Workers
│   └── rubberband.worker.ts    (Traitement audio offline)
├── UI Components
│   ├── AudioLooperContainer    (Container principal)
│   ├── FileUpload              (Upload fichier)
│   ├── WaveformDisplay         (Affichage waveform)
│   ├── AudioPlayer             (Contrôles lecture)
│   └── RubberbandPitchControl  (Contrôle pitch)
└── Docs (ce dossier)
    ├── TECHNICAL_OVERVIEW.md
    ├── AUDIO_CONTROLS_SYNC.md
    ├── AUDIO_QUALITY_TESTING.md
    └── README.md (ce fichier)
```

## Liens Utiles

### Documentation Externe

- [Rubberband Library](https://breakfastquay.com/rubberband/) - Documentation officielle
- [Tone.js](https://tonejs.github.io/) - Documentation Tone.js
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) - MDN
- [WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly) - MDN

### Fichiers Clés du Projet

- `rubberband-engine.service.ts` - Service principal Rubberband
- `tone-engine.service.ts` - Service principal Tone.js
- `rubberband.worker.ts` - Web Worker pour le traitement
- `audio-player.service.ts` - Facade simplifiant l'accès

## Contribution

Pour ajouter de la documentation :

1. Créer un fichier `.md` dans ce dossier
2. Suivre le même format (titre, contenu structuré, exemples)
3. Ajouter une entrée dans ce README
4. Utiliser des diagrammes si nécessaire (Mermaid, ASCII art)

## Maintenance

Ce dossier doit être maintenu à jour lors des changements :

- ✅ Ajout/modification de contrôles audio → Mettre à jour `AUDIO_CONTROLS_SYNC.md`
- ✅ Changement d'algorithme → Mettre à jour `AUDIO_QUALITY_TESTING.md`
- ✅ Nouveau document → Ajouter une section dans ce README
- ✅ Problème connu résolu → Retirer de la section "Problèmes connus"

---

**Dernière mise à jour** : Tâche 14 - Tests de qualité audio et validation des algorithmes
**Auteur** : Claude Code
**Version** : 1.0
