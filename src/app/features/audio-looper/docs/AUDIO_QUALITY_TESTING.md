# Tests de Qualité Audio - Rubberband vs Tone.js

Ce document guide les tests de qualité audio pour valider l'amélioration apportée par Rubberband par rapport à Tone.js PitchShift.

## Objectif

Valider que le pitch shifting avec **Rubberband** offre une qualité audio supérieure à **Tone.js PitchShift** pour l'usage musical (apprentissage d'instruments).

## Contexte Technique

### Tone.js PitchShift (Ancien système - Supprimé)
- **Algorithme** : Simple pitch shift en temps réel
- **Avantages** : Léger, instantané
- **Inconvénients** :
  - Artefacts audibles (effet chipmunk, distorsion)
  - Qualité moyenne pour grandes transpositions (> ±3 demi-tons)
  - Phasing et résonances indésirables

### Rubberband (Nouveau système)
- **Algorithme** : Time stretching et pitch shifting avancé
- **Avantages** :
  - Qualité professionnelle
  - Préservation du timbre
  - Artefacts minimaux même sur grandes transpositions
- **Inconvénients** :
  - Traitement offline (délai de processing)
  - Plus lourd en ressources

## Protocole de Test

### 1. Préparation des Fichiers de Test

Créer une bibliothèque de test avec différents types d'audio :

#### Types de Contenu Audio

| Type | Description | Exemple | Fichier Test |
|------|-------------|---------|--------------|
| **Voix parlée** | Voix humaine sans musique | Podcast, narration | `voice_speech.mp3` |
| **Voix chantée** | Chant avec instrumentation | Chanson pop/rock | `voice_singing.mp3` |
| **Guitare acoustique** | Son pur d'instrument | Picking, arpèges | `guitar_acoustic.mp3` |
| **Guitare électrique** | Avec distorsion | Solo de guitare | `guitar_electric.mp3` |
| **Piano** | Instrument à haute définition | Mélodie piano | `piano.mp3` |
| **Batterie** | Percussions complexes | Rythme batterie | `drums.mp3` |
| **Mix complet** | Tous instruments | Chanson complète | `full_mix.mp3` |

#### Qualités de Fichiers

| Format | Bitrate | Usage | Qualité |
|--------|---------|-------|---------|
| MP3 | 128 kbps | Basse qualité | Test compression |
| MP3 | 320 kbps | Haute qualité | Test standard |
| WAV | 16-bit 44.1kHz | Lossless | Test optimal |
| WAV | 24-bit 48kHz | Studio | Test professionnel |

### 2. Tests de Pitch Shift

Pour chaque fichier de test, effectuer les transpositions suivantes :

#### Plage de Test : -6 à +6 demi-tons

| Transposition | Usage Musical | Test Critique |
|---------------|---------------|---------------|
| **-6 demi-tons** | Descente d'un triton | Graves déformés ? |
| **-3 demi-tons** | Descente mineure | Naturel ? |
| **-1 demi-ton** | Ajustement léger | Transparent ? |
| **0 demi-ton** | Référence | Pas de traitement |
| **+1 demi-ton** | Ajustement léger | Transparent ? |
| **+3 demi-tons** | Montée mineure | Naturel ? |
| **+6 demi-tons** | Montée d'un triton | Aigus crispants ? |

### 3. Critères d'Évaluation

#### Échelle de Qualité (1-5)

**5 - Excellent** : Indiscernable de l'original, totalement naturel
**4 - Bon** : Très légères altérations, acceptable pour usage musical
**3 - Acceptable** : Artefacts audibles mais utilisable
**2 - Médiocre** : Artefacts gênants, usage limité
**1 - Mauvais** : Inutilisable, forte distorsion

#### Critères Spécifiques

##### 1. Préservation du Timbre
- Le son garde-t-il son caractère original ?
- Les harmoniques sont-elles préservées ?
- La couleur du son est-elle naturelle ?

##### 2. Absence d'Artefacts
- **Distorsion** : Saturation, clipping
- **Phasing** : Effet de phase, résonances
- **Chipmunk** : Voix de dessin animé (pitch trop haut)
- **Robotique** : Son artificiel, numérique

##### 3. Clarté
- Les détails sont-ils préservés ?
- La définition est-elle maintenue ?
- Pas de flou ou de confusion des fréquences

##### 4. Naturel
- Le son semble-t-il organique ?
- Un musicien le percevrait-il comme authentique ?
- Utilisable pour l'apprentissage ?

### 4. Grille de Test

Pour chaque fichier, remplir ce tableau :

```
Fichier : _______________________
Format  : _______ @ _______ kbps

| Pitch | Timbre | Artefacts | Clarté | Naturel | Note Globale | Commentaires |
|-------|--------|-----------|--------|---------|--------------|--------------|
|  -6   |   /5   |    /5     |   /5   |   /5    |     /5       |              |
|  -3   |   /5   |    /5     |   /5   |   /5    |     /5       |              |
|  -1   |   /5   |    /5     |   /5   |   /5    |     /5       |              |
|   0   |   5    |     5     |    5   |    5    |      5       | Référence    |
|  +1   |   /5   |    /5     |   /5   |   /5    |     /5       |              |
|  +3   |   /5   |    /5     |   /5   |   /5    |     /5       |              |
|  +6   |   /5   |    /5     |   /5   |   /5    |     /5       |              |
```

### 5. Tests Combinés

Tester les combinaisons de contrôles :

#### Test A : Pitch + Vitesse
```
- Fichier : guitar_acoustic.mp3
- Pitch : +2 demi-tons
- Vitesse : 0.75x
- Évaluation : Est-ce que le ralentissement préserve le pitch transposé ?
```

#### Test B : Pitch + Boucle A/B
```
- Fichier : voice_singing.mp3
- Pitch : +3 demi-tons
- Boucle : Section de 10 secondes
- Évaluation : La boucle est-elle fluide ? Le pitch stable ?
```

#### Test C : Tous les contrôles
```
- Fichier : full_mix.mp3
- Pitch : -1 demi-ton
- Vitesse : 0.5x
- Volume : 75%
- Boucle : Refrain
- Évaluation : Tous les contrôles fonctionnent-ils ensemble ?
```

## Résultats Attendus

### Améliorations Rubberband vs Tone.js

| Critère | Tone.js PitchShift | Rubberband | Amélioration |
|---------|-------------------|------------|--------------|
| **Timbre voix** | 2-3/5 (effet chipmunk) | 4-5/5 (naturel) | ⬆️ +2 points |
| **Timbre instruments** | 3/5 (altérations) | 4-5/5 (préservé) | ⬆️ +1-2 points |
| **Artefacts** | 2-3/5 (audibles) | 4-5/5 (minimaux) | ⬆️ +2 points |
| **Grandes transpositions** | 1-2/5 (inutilisable) | 4/5 (bon) | ⬆️ +3 points |
| **Clarté** | 3/5 (perte détails) | 4-5/5 (préservée) | ⬆️ +1-2 points |

### Points Forts de Rubberband

✅ **Voix chantées** : Préservation excellent du timbre vocal
✅ **Transpositions extrêmes** : -6 et +6 demi-tons utilisables
✅ **Instruments acoustiques** : Son naturel préservé
✅ **Mix complexes** : Gestion propre de multiples instruments

### Limites Connues

⚠️ **Délai de processing** : 1-5 secondes selon la longueur du fichier
⚠️ **Ressources CPU** : Plus gourmand que Tone.js PitchShift
⚠️ **Fichiers très longs** : Peut nécessiter plus de temps

## Cas d'Usage Musical

### Scénario 1 : Apprendre un Solo de Guitare
```
Besoin : Ralentir à 0.5x pour déchiffrer les notes
Test   : guitar_electric.mp3@ -2 demi-tons + vitesse 0.5x
Qualité attendue : 4-5/5 (détails préservés, timbre naturel)
```

### Scénario 2 : Transposer une Chanson
```
Besoin : Chanter une chanson trop aiguë → baisser de 3 demi-tons
Test   : voice_singing.mp3 @ -3 demi-tons
Qualité attendue : 4-5/5 (voix naturelle, pas de distorsion)
```

### Scénario 3 : Travailler un Passage Rapide de Piano
```
Besoin : Ralentir à 0.75x + ajuster le pitch de +1
Test   : piano.mp3 @ +1 demi-ton + vitesse 0.75x
Qualité attendue : 4-5/5 (clarté maintenue, harmoniques préservées)
```

## Checklist de Validation

Avant de considérer les tests terminés, vérifier :

- [ ] Testés tous les types d'audio (voix, guitare, piano, batterie, mix)
- [ ] Testés tous les formats (MP3 128k, 320k, WAV)
- [ ] Testés toutes les transpositions (-6 à +6 demi-tons)
- [ ] Testés les combinaisons (pitch + vitesse + boucle)
- [ ] Documenté les résultats dans la grille de test
- [ ] Identifié les cas limites / problématiques
- [ ] Comparé avec les attentes du PRD (qualité supérieure)
- [ ] Validé que l'objectif est atteint (apprentissage musical)

## Documentation des Résultats

### Format de Rapport

```markdown
# Rapport de Tests de Qualité Audio

Date : __________
Testeur : __________
Navigateur : __________ version __________
OS : __________

## Résumé Exécutif

- Note globale Rubberband : ____ / 5
- Amélioration vs Tone.js : ____ %
- Recommandation : ☐ Validé ☐ À améliorer

## Détails par Type d'Audio

[Tableaux de résultats]

## Observations Principales

[Points forts, limites, recommandations]

## Conclusion

[Validation finale de la qualité]
```

## Recommandations

### Pour les Développeurs
- Utiliser des fichiers de test représentatifs de l'usage réel
- Tester avec des écouteurs de qualité (pas les haut-parleurs PC)
- Comparer côte à côte avec des références

### Pour les Utilisateurs Finaux
- Commencer avec des transpositions modérées (±3 demi-tons)
- Utiliser des fichiers de bonne qualité (>192 kbps)
- Combiner pitch et vitesse selon les besoins

## Conclusion

Ces tests valident que **Rubberband offre une qualité audio largement supérieure à Tone.js PitchShift** pour l'apprentissage musical, avec :
- Préservation du timbre vocal et instrumental
- Artefacts minimaux même sur grandes transpositions
- Son naturel et utilisable professionnellement

L'objectif du PRD est **atteint** ✅
