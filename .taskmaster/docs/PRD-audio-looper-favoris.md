# PRD - Système de Favoris pour Audio Looper

## Vue d'ensemble

Ajout d'un système de favoris permettant aux utilisateurs de sauvegarder localement jusqu'à 10 fichiers audio avec leurs réglages personnalisés (tonalité, vitesse, position de lecture, boucles A/B) pour reprendre facilement leur entraînement musical.

## Objectifs

- **Persistance locale** : Sauvegarder les buffers audio et leurs configurations sans backend
- **Accès rapide** : Permettre de retrouver et charger instantanément un morceau avec ses réglages
- **Gestion simple** : Interface intuitive pour ajouter, organiser et supprimer des favoris
- **Continuité de l'entraînement** : Reprendre exactement là où l'utilisateur s'était arrêté (réglages + position de lecture)

## Contraintes techniques

- Stockage local uniquement (localStorage + IndexedDB pour les buffers audio)
- Limite stricte de 10 favoris maximum
- Taille maximale par fichier : 10 Mo (cohérent avec upload existant)
- Compatible mobile et desktop (responsive)
- Pas de synchronisation cloud

## Fonctionnalités détaillées

### 1. Ajout aux favoris

#### 1.1 Bouton étoile dans la barre upload minimisée

**Localisation** : À côté du titre du fichier dans la barre upload minimisée en haut de l'écran

**États visuels** :
- **Non favori** : Étoile vide (outline)
- **Favori actif** : Badge "Favori" + étoile pleine dorée/jaune

**Comportement** :
- Clic sur étoile vide → Sauvegarde immédiate du favori (si < 10 favoris)
- Clic sur étoile pleine → Confirmation "Retirer des favoris ?" puis suppression
- Si limite atteinte (10 favoris) → Modal de sélection pour supprimer un favori existant

#### 1.2 Données sauvegardées par favori

**Métadonnées** :
- Titre du fichier (nom original)
- Date d'ajout (timestamp)
- Durée totale (en secondes)
- Taille du fichier (en octets/Mo)

**Réglages audio** :
- Tonalité (pitch) : valeur de -6 à +6 demi-tons
- Vitesse (playback rate) : 0.5x, 0.75x ou 1.0x
- Volume : **NON sauvegardé** (volume par défaut à 100% au chargement)
- Position de lecture : timestamp exact où l'utilisateur s'est arrêté (en secondes)
- Boucles A/B :
  - Position start (secondes)
  - Position end (secondes)
  - État de la boucle (loop ON/OFF)

**Buffer audio** :
- Buffer audio complet encodé pour stockage IndexedDB
- Waveform data (pour miniature dans liste)

#### 1.3 Gestion de la limite de 10 favoris

**Scénario : Ajout au-delà de 10 favoris**

1. Utilisateur clique sur étoile alors que 10 favoris existent déjà
2. Modal s'affiche : "Limite atteinte (10/10 favoris)"
3. **Affichage liste complète** dans la modal avec pour chaque favori :
   - Titre
   - Durée
   - Date d'ajout
   - Taille
   - Bouton "Supprimer"
4. L'utilisateur doit supprimer un favori pour libérer de l'espace
5. Une fois supprimé, le nouveau favori est automatiquement ajouté

**Information stockage** :
- Afficher en permanence dans le sidebar : "7/10 favoris • 45 MB / 100 MB"

### 2. Sidebar des favoris

#### 2.1 Accès au sidebar

**Bouton d'accès** : Icône fixe en haut à gauche (hamburger ou icône bibliothèque)

**Comportement** :
- Clic → Ouvre le sidebar (drawer) latéral
- Sidebar coulissant depuis la gauche
- Overlay semi-transparent sur le lecteur principal
- Clic sur overlay ou bouton fermeture → Ferme le sidebar

#### 2.2 Affichage par défaut au lancement

**Logique d'affichage** :
- Si **0 favori** → Afficher écran file-upload par défaut
- Si **≥ 1 favori** → Afficher liste des favoris en sidebar (fermé au lancement, bouton visible)

#### 2.3 Structure du sidebar

**Header du sidebar** :
- Titre "Mes favoris"
- Information : "7/10 favoris • 45 MB / 100 MB"
- Bouton "Modifier l'ordre" (active le mode réorganisation)
- Bouton "Upload nouveau fichier" (retour à file-upload)

**Liste des favoris** :
- Affichage vertical scrollable
- Ordre personnalisable par l'utilisateur

**Footer du sidebar** :
- Bouton "Fermer" ou swipe pour fermer

#### 2.4 Carte de favori (affichage)

Chaque carte dans la liste affiche :

1. **Waveform miniature** (en-tête de carte)
   - Version réduite de la forme d'onde (hauteur ~40-60px)
   - Marqueurs A/B visibles si définis

2. **Titre du fichier** (tronqué si nécessaire)

3. **Icônes des réglages actifs** (badges compacts)
   - Pitch : "+2" ou "-3" si ≠ 0
   - Vitesse : "0.75x" si ≠ 1.0x
   - Boucle : "A-B" si boucle définie

4. **Durée et date** (ligne secondaire)
   - Exemple : "3:45 • Ajouté le 15/01/2025"

5. **Taille du fichier** (ligne secondaire)
   - Exemple : "4.2 MB"

6. **Actions rapides** (boutons icônes à droite)
   - Bouton Play/Pause
   - Bouton Supprimer (icône poubelle)

#### 2.5 Interaction avec une carte de favori

**Clic simple sur la carte** :
- Charge le favori dans le lecteur principal
- Restaure tous les réglages (pitch, vitesse, boucles A/B)
- **Restaure la position de lecture** sauvegardée
- **Ne lance PAS la lecture** (reste en pause à la position restaurée)
- Ferme automatiquement le sidebar
- Badge "Favori" + étoile pleine apparaît dans la barre upload

**Bouton Play sur la carte** :
- Charge le favori avec tous les réglages + position de lecture
- Lance la lecture immédiatement depuis la position sauvegardée
- Ferme le sidebar

**Bouton Supprimer** :
- Confirmation "Supprimer ce favori ?"
- Suppression du buffer et des métadonnées
- Mise à jour du compteur

### 3. Modification d'un favori existant

#### 3.1 Détection des modifications

Lorsqu'un favori est chargé et que l'utilisateur modifie :
- Tonalité (pitch shift)
- Vitesse (playback rate)
- Boucles A/B (positions ou état ON/OFF)
- Position de lecture (déplacement dans le morceau)

**Comportement** :
- Un bouton "Sauvegarder les modifications" apparaît dans la barre upload minimisée
- Positionnement : Entre le titre et le badge "Favori"
- Style : Bouton secondaire discret

**Clic sur "Sauvegarder les modifications"** :
- Met à jour les réglages du favori existant (y compris la position de lecture actuelle)
- Affiche une notification : "Favori mis à jour"
- Le bouton disparaît

**Si l'utilisateur change de fichier sans sauvegarder** :
- Les modifications sont perdues
- Le favori conserve ses anciens réglages et sa position de lecture

### 4. Réorganisation des favoris

#### 4.1 Mode édition

**Activation** : Clic sur bouton "Modifier l'ordre" dans le header du sidebar

**Changements visuels** :
- Cartes affichent une icône de drag handle (≡) à gauche
- Boutons Play/Supprimer masqués temporairement
- Message : "Glissez pour réorganiser"

**Interaction drag & drop** :
- Touch-friendly (optimisé mobile)
- Glisser une carte verticalement pour changer sa position
- Animation fluide lors du déplacement
- Mise à jour immédiate de l'ordre

**Sortie du mode édition** :
- Bouton "Terminer" remplace "Modifier l'ordre"
- Sauvegarde automatique du nouvel ordre

### 5. Persistance et stockage

#### 5.1 Technologies de stockage

**localStorage** :
- Métadonnées des favoris (JSON)
- Ordre personnalisé des favoris
- Clé : `audioLooperFavorites`

**IndexedDB** :
- Buffers audio complets
- Waveform data pour miniatures
- Clé par favori : `favorite_${timestamp}`

#### 5.2 Structure de données

```json
{
  "favorites": [
    {
      "id": "1737800000000",
      "fileName": "Solo_GuitarPro.mp3",
      "dateAdded": 1737800000000,
      "duration": 225.5,
      "fileSize": 4200000,
      "settings": {
        "pitch": 2,
        "playbackRate": 0.75,
        "currentTime": 65.8,
        "loopStart": 45.2,
        "loopEnd": 78.9,
        "loopEnabled": true
      },
      "bufferKey": "favorite_1737800000000"
    }
  ],
  "order": ["1737800000000", "1737800000001", ...],
  "totalSize": 42000000
}
```

#### 5.3 Gestion de la mémoire

**Calcul de taille totale** :
- Somme des tailles de tous les favoris
- Affichage dans le sidebar : "45 MB / 100 MB max"
- Limite théorique : 100 MB (10 fichiers × 10 MB max)

**Nettoyage** :
- Suppression complète du buffer IndexedDB lors du retrait d'un favori
- Vérification de l'intégrité au chargement de l'app

### 6. UX et design

#### 6.1 Feedback utilisateur

**Actions avec feedback** :
- Ajout favori → Toast "Ajouté aux favoris"
- Suppression → Toast "Favori supprimé"
- Modification sauvegardée → Toast "Modifications enregistrées"
- Limite atteinte → Modal explicative

**États de chargement** :
- Spinner lors de la sauvegarde d'un gros fichier
- Skeleton loader pour les cartes de favoris au chargement initial

#### 6.2 Responsive design

**Mobile (< 768px)** :
- Sidebar pleine largeur (90% de l'écran)
- Cartes favoris en pleine largeur
- Drag & drop tactile optimisé

**Desktop (≥ 768px)** :
- Sidebar 320-400px de largeur fixe
- Overlay semi-transparent sur le reste
- Hover states sur les cartes

#### 6.3 Cohérence visuelle

**Style** :
- Reprendre le design existant d'audio-looper
- Boutons textuels uniquement (sauf volume et actions rapides)
- Waveform comme élément central visuel
- Mode sombre compatible

### 7. Cas limites et gestion d'erreurs

#### 7.1 Stockage plein (quota dépassé)

**Détection** :
- Try/catch sur IndexedDB writes
- Si quota dépassé → Message "Espace de stockage insuffisant"
- Invitation à supprimer des favoris

#### 7.2 Buffer audio corrompu

**Scénario** : Favori sauvegardé mais buffer IndexedDB illisible

**Comportement** :
- Affichage d'une erreur "Impossible de charger ce favori"
- Option "Supprimer ce favori corrompu"
- Nettoyage automatique des entrées orphelines

#### 7.3 Fichier déjà en favoris

**Scénario** : Utilisateur essaie d'ajouter un fichier déjà sauvegardé

**Détection** : Comparaison par nom de fichier + taille
**Comportement** : Message "Ce fichier est déjà dans vos favoris"

### 8. Évolutions futures (hors scope V1)

- Recherche/filtrage dans les favoris
- Tags/catégories pour organiser les favoris
- Export/import de favoris (partage)
- Statistiques d'utilisation (temps d'écoute par favori)
- Suggestions intelligentes basées sur les réglages fréquents

## Critères d'acceptation

### Must-have (V1)
- [ ] Bouton étoile dans barre upload avec états visuels corrects
- [ ] Sauvegarde locale de 10 favoris max avec buffers audio + métadonnées
- [ ] Sidebar des favoris avec liste scrollable
- [ ] Cartes favoris affichant waveform, réglages, durée, date, taille
- [ ] Chargement d'un favori restaure pitch, vitesse, position de lecture, boucles A/B
- [ ] Volume par défaut à 100% au chargement d'un favori
- [ ] Position de lecture sauvegardée automatiquement lors de l'ajout aux favoris
- [ ] Position de lecture mise à jour lors de "Sauvegarder les modifications"
- [ ] Bouton "Sauvegarder les modifications" pour mettre à jour un favori
- [ ] Mode édition avec drag & drop pour réorganiser
- [ ] Modal de suppression quand limite de 10 favoris atteinte
- [ ] Affichage "X/10 favoris • Y MB / 100 MB" dans sidebar
- [ ] Gestion d'erreurs (quota, corruption buffer)
- [ ] Responsive mobile et desktop

### Nice-to-have (futures versions)
- [ ] Animations fluides d'ouverture/fermeture sidebar
- [ ] Prévisualisation audio au survol d'une carte (desktop)
- [ ] Raccourcis clavier pour navigation dans favoris

## Dépendances techniques

- **Stockage** : localStorage + IndexedDB (API native)
- **Audio** : Tone.js (déjà utilisé)
- **Waveform** : Canvas API ou wavesurfer.js (déjà utilisé)
- **Drag & drop** : Bibliothèque touch-friendly (ex: SortableJS ou Angular CDK Drag & Drop)

## Métriques de succès

- Taux d'utilisation des favoris (% d'utilisateurs créant ≥ 1 favori)
- Nombre moyen de favoris par utilisateur actif
- Taux de modification de favoris existants
- Taux d'erreurs de stockage (quota, corruption)

---

**Date de création** : 2025-01-23
**Version** : 1.0
**Statut** : À implémenter
