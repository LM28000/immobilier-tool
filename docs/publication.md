# Publication

## Chemin d'une modification

```
modification dans src/ ou data/
  → python3 build.py      index.html, dist/, sw.js
  → sync.sh (launchd)     contrôles, tests rapides, commit, push
  → GitHub Pages          https://insula.du-cray.eu (Cloudflare devant)
```

## Publication automatique (`sync.sh`)

`install-sync.sh` installe une tâche macOS, `com.lm28000.immobilier-sync`. Elle lance `sync.sh` toutes les heures, et aussi chaque fois que `index.html` change. À chaque passage, `sync.sh` :

1. annule un rebase interrompu et s'arrête ;
2. vérifie que chaque fichier JSON de `data/` se lit et que le script de `index.html` est complet et sans erreur de syntaxe ;
3. lance les tests rapides (`tests/unit.js`, `tests/test_donnees.py`) ;
4. fait un commit de **tout le dossier**, avec un message qui dit ce qui a changé (« Annonces du … », « Mise à jour : … ») ;
5. fait le push sur GitHub, et relance plus tard un push resté en échec.

Si une étape échoue, rien n'est publié. Une ligne « NON PUBLIÉ » s'ajoute à `sync.log`, et une notification macOS s'affiche.

> Comme tout le dossier est publié, n'écrivez **pas** de fichiers temporaires dans le dépôt. Ne lancez pas non plus `build.py` juste pour voir : la page serait publiée. Pour un travail en plusieurs étapes, mettez d'abord la tâche en pause :
>
> ```bash
> launchctl unload ~/Library/LaunchAgents/com.lm28000.immobilier-sync.plist   # pause
> launchctl load   ~/Library/LaunchAgents/com.lm28000.immobilier-sync.plist   # reprise
> ```

## Hébergement et domaine

- **GitHub Pages** sert la branche `main` à la racine. `.nojekyll` désactive Jekyll.
- **Domaine** : `insula.du-cray.eu` (fichier `CNAME`), derrière Cloudflare.
- **Anciennes adresses** :
  - le dépôt s'appelait `immobilier-tool` jusqu'au 12 novembre 2026. GitHub redirige les adresses du dépôt, mais plus `https://lm28000.github.io/immobilier-tool/` (404) ; `https://lm28000.github.io/insula/` renvoie vers le domaine ;
  - `essai.html` et `v2.html` renvoient à la page, en gardant `#f=` et `#g=` ;
  - `immobilier.du-cray.eu`, utilisée du 10 au 11 novembre 2026, n'existe plus.
- Le site n'est pas indexé par les moteurs de recherche (balise `robots noindex`).

## App installable (PWA)

`manifest.webmanifest`, `sw.js` et `icons/` rendent la page installable sur téléphone et utilisable hors ligne. `sw.js` ne garde que la page elle-même. `build.py` met à jour son numéro de version, calculé à partir de la page : un téléphone installe la nouvelle version au chargement suivant.

## App Android

L'app native Insula (Expo et React Native) a un dépôt privé. Elle reprend le moteur de `dist/moteur.js`. Deux fichiers du site la concernent :

- `.well-known/assetlinks.json` : les empreintes des certificats de l'app, données par la Play Console. Elles permettent que les liens du site ouvrent l'app. Il faut garder **exactement** le bloc de la Console.
- `confidentialite.html` et `suppression.html` : les pages demandées par le Play Store.

## Mettre à jour le schéma Supabase

Ajoutez une nouvelle étape datée à la fin de `supabase.sql`. Elle doit pouvoir être rejouée sans risque pour les lignes existantes. Collez-la ensuite dans l'éditeur SQL de Supabase. Ne rouvrez jamais la table `annonces` en lecture publique : la vue `annonces_publiques` est faite pour ça.
