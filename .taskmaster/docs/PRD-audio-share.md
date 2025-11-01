# PRD - Fonctionnalité de Partage Audio

## Vue d'ensemble

Permettre aux utilisateurs de **partager rapidement** le fichier audio en cours d'écoute avec les modifications appliquées (pitch et tempo) via les applications natives du système (WhatsApp, Google Drive, email, etc.).

## Objectif

Offrir un moyen simple et rapide de partager l'audio modifié avec d'autres personnes, sans nécessiter de stockage cloud ou de backend. L'utilisateur doit pouvoir partager en 2 clics maximum.

## Public cible

- **Musiciens** partageant des playbacks modifiés avec leur groupe
- **Professeurs de musique** envoyant des exercices personnalisés à leurs élèves
- **Étudiants** partageant des extraits ralentis pour l'apprentissage
- **Utilisateurs mobiles** privilégiant les flux de partage natifs

## Fonctionnalités MVP (Version 1)

### 1. Bouton de partage dans l'audio player

- Ajouter un bouton "Partager" dans l'audio player
- Icône universelle de partage (flèche sortant d'une boîte)
- Visible uniquement si Web Share API est supporté par le navigateur
- Désactivé si aucun fichier audio n'est chargé
- Position : Après les badges Pitch/Speed, avant le bouton Réglages

### 2. Partage via Web Share API

- Utiliser l'API native `navigator.share()`
- Partager le fichier audio **avec les modifications appliquées** (pitch et tempo si présents)
- **Si aucune modification n'est appliquée** : partager le fichier audio original quand même
- Format de fichier : **MP3** (compression optimale pour le partage)
- Qualité : **192 kbps** (bon compromis taille/qualité)

### 3. Encodage MP3 côté client

**Création d'un système d'encodage complet :**
- Installer la bibliothèque `lamejs` pour encodage MP3
- Créer un **Web Worker** dédié pour encoder l'audio en arrière-plan
- Récupérer l'AudioBuffer traité depuis RubberbandEngineService
- Convertir AudioBuffer → MP3 via le Web Worker
- Créer un Blob MP3 partageable

**Web Worker pour performance :**
- Éviter le blocage de l'UI pendant l'encodage
- Feedback de progression en temps réel (0-100%)
- Support mono/stéréo
- Gestion des erreurs d'encodage

### 4. Génération du nom de fichier

- Créer un nom de fichier descriptif incluant les modifications
- Format : `{nom-original}_pitch{valeur}_tempo{valeur}_shared.mp3`
- Exemples :
  - Sans modifications : `audio_shared.mp3`
  - Avec pitch : `guitar_pitch-2_shared.mp3`
  - Avec tempo : `piano_tempo0.75_shared.mp3`
  - Combiné : `song_pitch+3_tempo0.5_shared.mp3`

### 5. Expérience utilisateur

**Flux nominal :**
1. L'utilisateur charge un fichier audio
2. Il applique des modifications (pitch, tempo)
3. Il clique sur le bouton "Partager"
4. Le système encode l'audio en MP3 (avec feedback de progression)
5. Le menu de partage natif s'ouvre avec toutes les apps disponibles
6. L'utilisateur choisit WhatsApp, Google Drive, email, etc.
7. Le fichier est partagé via l'app sélectionnée

**Feedback visuel :**
- Afficher un spinner dans le bouton pendant l'encodage
- Barre de progression si encodage > 2 secondes
- Message de succès discret après partage réussi
- Gestion des erreurs (navigateur non compatible, encodage échoué)

### 6. Contraintes techniques

- **Navigateurs supportés** : Chrome/Edge (Desktop + Mobile), Safari (iOS), Firefox (Android)
- **Format partagé** : MP3 uniquement (compatibilité universelle)
- **Taille fichier** : Pas de limite technique (dépend du fichier source)
- **Encodage** : Web Worker pour ne pas bloquer l'UI
- **Pas de backend** : Tout se passe côté client
- **Pas de stockage** : Le fichier est généré à la volée et partagé immédiatement

## Positionnement UI

### Emplacement du bouton

- **Audio Player** (composant principal)
- Position : Entre les badges Pitch/Speed et le bouton Réglages
- Style : Cohérent avec les autres boutons (cercle, icône centrée, hover subtil)

### Icône de partage

```
Icône standard de partage :
- Flèche sortant d'une boîte (share/upload icon)
- Ou : trois points reliés par des lignes (share node)
```

### États du bouton

- **Désactivé** : Audio non chargé ou navigateur non compatible
- **Normal** : Prêt à partager (couleur neutre)
- **Loading** : Encodage en cours (spinner rotatif)
- **Hover** : Changement de couleur + tooltip "Partager"

## Architecture technique à créer

### 1. Service de partage audio

**Créer un nouveau service `AudioShareService` :**
- Méthode `shareAudio(buffer, fileName, pitch, tempo)`
- Vérification de compatibilité Web Share API
- Gestion de l'encodage MP3 via Web Worker
- Invocation de `navigator.share()` avec le fichier
- Gestion des erreurs et feedback

### 2. Web Worker MP3

**Créer un nouveau worker `mp3-encoder.worker.ts` :**
- Import de lamejs
- Encodage AudioBuffer → MP3
- Feedback de progression (événements au worker)
- Conversion Float32Array → Int16Array
- Génération du Blob MP3 final

### 3. Intégration dans AudioPlayerComponent

**Modifications du composant :**
- Ajouter le bouton dans le template HTML
- Injecter AudioShareService
- Méthode `shareAudio()` appelée au clic
- Récupération du buffer traité depuis RubberbandEngine
- Affichage de l'état de partage (loading, success, error)

### 4. Gestion du nom de fichier

**Dans AudioPlayerComponent :**
- Signal `currentFileName` pour stocker le nom du fichier chargé
- Passage du nom depuis le container parent (ViewChild ou Input)
- Génération automatique du nom avec modifications appliquées

## Critères de succès

1. ✅ Le bouton est visible et accessible sur mobile
2. ✅ Le partage s'effectue en moins de 3 clics
3. ✅ L'encodage MP3 prend moins de 10 secondes pour un fichier de 3 minutes
4. ✅ Le fichier partagé contient bien les modifications pitch/tempo
5. ✅ Le nom de fichier est descriptif et inclut les réglages
6. ✅ Compatibilité avec au moins 3 applications de partage (WhatsApp, Gmail, Drive)
7. ✅ L'UI ne se bloque pas pendant l'encodage (Web Worker)
8. ✅ Feedback de progression visible pour l'utilisateur

## Cas limites et contraintes

### Navigateurs non compatibles

- **Problème** : Web Share API n'est pas supporté sur tous les navigateurs (ex: Firefox Desktop)
- **Solution** : Masquer le bouton si `navigator.share` n'existe pas ou si `navigator.canShare()` retourne false
- **Détection** : Vérifier `typeof navigator.share === 'function'` au chargement

### Fichiers volumineux

- **Problème** : Fichiers > 10 Mo peuvent être rejetés par certaines apps de partage
- **Solution** : Afficher un avertissement si le fichier source est > 10 Mo
- **Message** : "Ce fichier est volumineux et pourrait ne pas être accepté par toutes les applications"

### Encodage long

- **Problème** : Encodage MP3 peut prendre 5-10 secondes pour fichiers longs
- **Solution** :
  - Afficher une barre de progression avec % et temps estimé
  - Permettre l'annulation de l'encodage
  - Désactiver le bouton pendant le traitement

### Échec du partage

- **Problème** : Utilisateur annule le partage ou erreur de l'app cible
- **Solution** :
  - Gérer l'exception `AbortError` silencieusement (annulation volontaire)
  - Afficher une erreur uniquement si échec technique
  - Logger l'erreur dans la console pour debugging

### Audio non modifié

- **Problème** : Si pitch = 0 et tempo = 1.0, l'audio n'est pas modifié
- **Solution** :
  - Partager quand même (l'utilisateur peut vouloir partager l'original)
  - Nom de fichier sans suffixe de modifications : `audio_shared.mp3`

## Exclusions (Hors scope MVP)

❌ Partage via lien web (nécessite backend)
❌ Partage sur réseaux sociaux intégrés (Facebook, Twitter API)
❌ Historique des partages
❌ Statistiques de partage (nombre de partages, vues)
❌ Partage de plusieurs fichiers simultanés
❌ Partage en WAV (trop volumineux, MP3 uniquement)
❌ Compression personnalisable du MP3 (192 kbps fixe)
❌ Ajout de métadonnées ID3 au fichier MP3 (titre, artiste, etc.)
❌ Prévisualisation avant partage
❌ Choix du format d'export (MP3 uniquement)

## Évolutions futures (V2)

💡 Partage de favoris (avec réglages sauvegardés)
💡 Génération de liens courts pour partage web (avec backend)
💡 Ajout de métadonnées personnalisées (titre, artiste, album)
💡 Support du partage de boucles A/B spécifiques
💡 Partage direct sur réseaux sociaux avec prévisualisation
💡 QR Code pour partage en présentiel
💡 Compression adaptative selon la taille du fichier
💡 Support WAV pour partage de qualité studio

## Dépendances techniques

### Bibliothèques à installer
- **lamejs** : Encodage MP3 côté client (~200 KB)

### APIs natives du navigateur
- **Web Share API** : `navigator.share()` et `navigator.canShare()`
- **Web Worker API** : Traitement parallèle de l'encodage
- **AudioBuffer API** : Manipulation des données audio

### Services Angular existants à utiliser
- **RubberbandEngineService** : Récupération du buffer traité (méthode `getCurrentProcessedBuffer()`)
- **ToneEngineService** : Récupération du playbackRate (tempo)

### Nouveaux services à créer
- **AudioShareService** : Service principal de partage
- **mp3-encoder.worker.ts** : Web Worker d'encodage MP3

## Estimation de complexité

- **Complexité** : Moyenne (création complète de l'infrastructure)
- **Durée estimée** : 4-6 heures
  - Installation lamejs : 15 min
  - Web Worker MP3 : 1h30
  - AudioShareService : 1h30
  - Intégration UI : 1h
  - Tests et ajustements : 1h
- **Risques** :
  - Compatibilité navigateur Web Share API
  - Performance d'encodage MP3
  - Gestion de la mémoire pour gros fichiers

## Références techniques

- [Web Share API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)
- [Can I Use - Web Share API](https://caniuse.com/web-share)
- [lamejs - NPM](https://www.npmjs.com/package/lamejs)
- [Web Workers - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)

## Livrables attendus

1. ✅ Service `AudioShareService` complet et testé
2. ✅ Web Worker `mp3-encoder.worker.ts` fonctionnel
3. ✅ Bouton "Partager" intégré dans audio-player
4. ✅ Feedback visuel (spinner, progression) opérationnel
5. ✅ Gestion des erreurs et cas limites
6. ✅ Documentation des méthodes créées

---

**Date de rédaction** : 2025-11-01
**Version** : 1.1 (après rollback)
**Statut** : Prêt pour découpage TaskMaster AI
