# Migration des fichiers locaux vers S3

Ce guide explique comment migrer vos fichiers de stockage local vers un bucket S3 compatible (comme Exoscale S3).

## Prérequis

1. **Configuration S3 complète** : Assurez-vous d'avoir configuré tous les paramètres S3 dans l'interface d'administration :
   - Endpoint S3 (ex: `https://sos-ch-gva-2.exo.io/`)
   - Access Key
   - Secret Key
   - Bucket Name
   - Region

2. **Activation du stockage S3** : Activez `use_s3_storage` dans les paramètres du site.

3. **Bucket créé** : Le bucket S3 doit exister et être accessible avec les credentials fournis.

## Étapes de migration

### 1. Test de connexion (dry-run)

Avant de migrer réellement, testez la connexion et voyez ce qui sera migré :

```bash
docker-compose exec backend python manage.py migrate_to_s3 --dry-run
```

Cette commande :
- Vérifie la configuration S3
- Teste la connexion au bucket
- Affiche tous les fichiers qui seraient migrés
- **Ne modifie rien** (mode dry-run)

### 2. Migration avec vérification

Si le dry-run fonctionne, lancez la migration en sautant les fichiers déjà présents sur S3 :

```bash
docker-compose exec backend python manage.py migrate_to_s3 --skip-existing
```

Cette commande :
- Migre tous les fichiers locaux vers S3
- Ignore les fichiers déjà présents sur S3 (évite les doublons)
- Met à jour les références dans la base de données
- **Conserve les fichiers locaux** (pour sécurité)

### 3. Migration complète

Pour migrer tous les fichiers sans vérifier s'ils existent déjà :

```bash
docker-compose exec backend python manage.py migrate_to_s3
```

### 4. Options avancées

```bash
# Traiter par lots de 20 jobs à la fois (par défaut: 10)
docker-compose exec backend python manage.py migrate_to_s3 --batch-size 20

# Combinaison d'options
docker-compose exec backend python manage.py migrate_to_s3 --skip-existing --batch-size 50
```

## Options disponibles

| Option | Description |
|--------|-------------|
| `--dry-run` | Affiche ce qui serait migré sans faire de modifications |
| `--skip-existing` | Ignore les fichiers déjà présents sur S3 |
| `--batch-size N` | Traite N jobs à la fois (défaut: 10) |

## Ce que fait le script

1. **Vérification de la configuration** :
   - Lit les paramètres S3 depuis `SiteSettings`
   - Teste la connexion au bucket S3

2. **Migration des fichiers** :
   - Pour chaque `ConversionJob` :
     - Migre le fichier original (`original_file`)
     - Migre le fichier converti (`output_file`) s'il existe
   - Upload les fichiers vers S3 en conservant la structure de dossiers
   - Met à jour les références dans la base de données

3. **Rapport** :
   - Affiche le nombre de fichiers migrés
   - Affiche les erreurs éventuelles
   - Affiche les fichiers ignorés

## Structure des fichiers sur S3

Les fichiers sont organisés de la même manière que localement :

```
bucket-name/
├── uploads/
│   └── {user_id}/
│       └── {job_id}.mkv
└── outputs/
    └── {user_id}/
        └── {job_id}.mkv
```

## Sécurité

⚠️ **Important** : Par défaut, le script **ne supprime pas** les fichiers locaux après migration. Cela vous permet de :
- Vérifier que tout fonctionne correctement
- Garder une sauvegarde locale
- Revenir en arrière si nécessaire

Si vous souhaitez supprimer les fichiers locaux après migration réussie, vous pouvez modifier le script (lignes commentées à la fin de la méthode `_migrate_file`).

## Dépannage

### Erreur : "S3 storage is not enabled"
→ Activez `use_s3_storage` dans les paramètres du site (admin panel)

### Erreur : "S3 configuration is incomplete"
→ Vérifiez que tous les champs S3 sont remplis dans les paramètres du site

### Erreur : "Failed to connect to S3"
→ Vérifiez :
- Les credentials (Access Key / Secret Key)
- L'endpoint S3 (doit se terminer par `/`)
- Que le bucket existe et est accessible
- Les permissions du bucket (lecture/écriture)

### Fichiers non trouvés localement
→ Certains fichiers peuvent avoir été supprimés. Le script les ignore et continue.

## Après la migration

1. **Testez le téléchargement** : Essayez de télécharger quelques fichiers convertis pour vérifier que tout fonctionne.

2. **Vérifiez l'espace disque** : Une fois que vous êtes sûr que tout fonctionne, vous pouvez supprimer les fichiers locaux pour libérer de l'espace :
   ```bash
   # ATTENTION : Cette commande supprime définitivement les fichiers locaux
   # Assurez-vous que la migration est complète et testée avant !
   docker-compose exec backend find /app/media -type f -delete
   ```

3. **Configuration du storage backend** : Pour que les nouveaux fichiers soient automatiquement stockés sur S3, assurez-vous que :
   - `use_s3_storage` est activé dans SiteSettings
   - Les variables d'environnement sont configurées (si utilisées)
   - Le storage backend Django est configuré dans `settings.py`

## Support

Si vous rencontrez des problèmes, vérifiez :
- Les logs du script (affichés dans la console)
- Les logs Django (`docker-compose logs backend`)
- La configuration S3 dans l'interface d'administration
