# Où acheter notre studio ?

Comparateur de 13 villes de l'Ouest pour un studio meublé en location : prix, loyers, quartiers (IRIS), DPE, annonces Bien'ici et calcul de rendement.

Page en ligne : https://lm28000.github.io/immobilier-tool/

- `index.html` : la page, autonome (aucun serveur). La liste « Nos biens » est gardée dans le navigateur de chacun ; l'échange se fait avec « Copier la liste » / « Importer ».
- `sync.sh` : pousse `index.html` sur GitHub quand il a changé.
- `install-sync.sh` : installe une tâche macOS (launchd) qui lance `sync.sh` toutes les heures et dès que `index.html` change.

Estimations, pas un conseil financier.
