# Sécurité

## Signaler un problème

Pour une faille (accès à des données d'un groupe, écriture possible dans la base, fuite d'un code de groupe…), **n'ouvrez pas de ticket public**. Utilisez le signalement privé de GitHub : onglet **Security › Report a vulnerability** de ce dépôt.

Indiquez ce qui est touché, comment le reproduire et ce qu'on peut obtenir. Une réponse est donnée dès que possible ; c'est un projet personnel, sans délai garanti.

## Ce qui est protégé

- Les annonces, leur historique et leurs fiches sont dans Supabase, pas dans le dépôt. La table `annonces` est fermée ; seule la vue en lecture seule `annonces_publiques` est ouverte.
- La liste d'un groupe (`biens`) n'est lisible et modifiable qu'avec son code. La base n'en garde que l'empreinte SHA-256. Les écritures sont bornées en forme, en taille et en nombre.
- Le code de groupe reste dans l'URL après `#` : il n'est jamais envoyé au serveur de la page.
- La clé Supabase de la page est la clé publiable (`sb_publishable_…`), faite pour être vue : toutes les règles d'accès sont dans la base (`supabase.sql`).
- Aucun secret n'est dans le dépôt : le code de groupe du Mac est dans `~/.config/immobilier-tool/`, les clés de l'app Android ailleurs, le secret des tests (`SB_GROUPE`) dans GitHub.
