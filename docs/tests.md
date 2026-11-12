# Tests

```bash
npm test             # build, puis les cinq suites
npm run test:unit    # calcul et données (quelques secondes, sans navigateur)
npm run test:mcp     # serveur MCP
npm run test:e2e     # bout en bout, ordinateur et téléphone (Playwright)
```

Chaque suite se termine par une ligne « N/N tests réussis ». C'est **cette ligne** qu'il faut lire. Une suite peut finir sans code d'erreur alors qu'un test a échoué : un test raté s'affiche avec ✗.

| Suite | Fichier | Nombre (12 novembre 2026) | Ce qu'elle vérifie |
|---|---|---|---|
| unitaires | `tests/unit.js` | 52 | calcul financier et fiscal (régimes, amortissements, plus-value, associés, TRI), nettoyage des biens partagés |
| données | `tests/test_donnees.py` | 59 | scripts de `tools/`, cohérence des villes et des fichiers de `data/` |
| MCP | `tests/mcp.test.mjs` | 15 | chaque outil du serveur MCP, avec les chiffres de l'app |
| bout en bout v2 | `tests/run.js` | 169 | l'ancienne interface (`dist/test.html`) : carte à chaque zoom, thème, réglages communs sur une liste simulée |
| bout en bout Insula | `tests/run-v3.js` | 209 | le site (`dist/essai-test.html`) : les quatre espaces, la fiche, les groupes et les invitations, le thème, sur ordinateur et téléphone |

## Isolement

- Les tests de bout en bout **n'écrivent jamais dans Supabase**. La liste commune est simulée et les appels sont interceptés.
- Les services extérieurs (géocodage, trajets, Géorisques, Overpass) reçoivent des réponses fixes.
- `tests/vendor/` contient MapLibre, pour tester la carte 3D sans réseau. Le fond de carte est remplacé par un style vide.
- Les suites de bout en bout ont besoin des annonces du jour en local : lancez `python3 tools/supabase_annonces.py pull` d'abord.

## Où ils tournent

- **Avant chaque publication** : `sync.sh` lance les tests unitaires et ceux des données. Il ne publie rien s'ils échouent.
- **GitHub Actions** : `.github/workflows/tests.yml` décrit la suite complète. Il récupère les annonces avec le secret `SB_GROUPE`.
- Ne lancez pas deux navigateurs Playwright en même temps, par exemple `npm test` pendant une autre session de test : les suites se gênent.
