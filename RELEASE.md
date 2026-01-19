# Guide de Release

## Pourquoi les badges ne fonctionnent pas ?

Les badges dans le README pointent vers les workflows GitHub Actions, mais :
1. **Les workflows n'ont pas encore été poussés** sur GitHub
2. **Les workflows n'ont pas encore tourné**, donc GitHub ne peut pas générer les badges

## Solution : Première mise en place

### 1. Commiter et pousser tous les fichiers

```bash
# Ajouter tous les nouveaux fichiers (workflows, docs, etc.)
git add .

# Commiter
git commit -m "feat: add documentation, workflows, and release automation

- Add React documentation pages (/docs, /about, /features, /on-premise)
- Add Sphinx documentation structure
- Add GitHub Actions workflows (tests, docs, release)
- Add Makefile for release management
- Update translations"

# Pousser sur GitHub
git push origin main
```

### 2. Activer GitHub Pages

1. Aller sur : `https://github.com/voldardard/mkv2castUI/settings/pages`
2. **Source** : Sélectionner **"GitHub Actions"** (pas "Deploy from a branch")
3. Sauvegarder

### 3. Vérifier les workflows

Après le push, allez sur :
- `https://github.com/voldardard/mkv2castUI/actions`

Vous devriez voir :
- ✅ **Tests** - Se lance automatiquement
- ✅ **Deploy Documentation** - Se lance si `docs/` a changé
- ✅ **Release** - Se lance quand un tag `v*` est poussé

### 4. Les badges s'activeront automatiquement

Une fois que les workflows ont tourné au moins une fois, les badges dans le README afficheront :
- 🟢 **passing** (vert) si les tests passent
- 🔴 **failing** (rouge) si les tests échouent
- ⚪ **no status** (gris) si le workflow n'a pas encore tourné

## Utilisation du Makefile

### Préparer une release (sans pousser)

```bash
make release VERSION=0.1.0
```

Cela va :
- Mettre à jour la version dans `backend/mkv2cast_api/__version__.py`
- Mettre à jour la version dans `frontend/package.json`
- Mettre à jour le README
- **Ne pas** commiter ni pousser

### Préparer et pousser une release

```bash
make release-push VERSION=0.1.0
```

Cela va :
- Faire tout ce que `make release` fait
- Commiter les changements
- Créer un tag Git
- Pousser sur GitHub (déclenche les workflows)

### Vérifier si prêt pour release

```bash
make check
```

Vérifie :
- ✅ Branche correcte (main)
- ✅ Working directory propre
- ✅ Tests passent
- ✅ Versions cohérentes

### Autres commandes utiles

```bash
make help          # Affiche toutes les commandes
make test          # Lance tous les tests
make build         # Build les images Docker
make docs-build    # Build la doc Sphinx localement
make version       # Affiche la version actuelle
```

## Workflow de release recommandé

### Pour une release bêta (ex: v0.1.0)

```bash
# 1. Vérifier que tout est prêt
make check

# 2. Lancer les tests
make test

# 3. Préparer et pousser la release
make release-push VERSION=0.1.0

# 4. Les workflows se lancent automatiquement :
#    - Tests
#    - Documentation
#    - Release GitHub (si tag créé)
```

### Pour une release patch (ex: v0.1.1)

```bash
# Même processus, juste changer la version
make release-push VERSION=0.1.1
```

## Dépannage

### Les badges restent gris

1. Vérifier que les workflows existent : `https://github.com/voldardard/mkv2castUI/actions`
2. Vérifier qu'au moins un workflow a tourné
3. Attendre quelques minutes (GitHub met à jour les badges avec un délai)

### Les workflows ne se lancent pas

1. Vérifier que les fichiers `.github/workflows/*.yml` sont bien dans le repo
2. Vérifier la syntaxe YAML (GitHub affichera des erreurs)
3. Vérifier les permissions dans les settings du repo

### Erreur "workflow not found"

Les workflows doivent être dans `.github/workflows/` et poussés sur GitHub.

## URLs importantes

- **Actions** : `https://github.com/voldardard/mkv2castUI/actions`
- **Pages Settings** : `https://github.com/voldardard/mkv2castUI/settings/pages`
- **Documentation** : `https://voldardard.github.io/mkv2castUI/` (après premier déploiement)
