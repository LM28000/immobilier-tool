# Le calcul

Toutes les villes, tous les quartiers et toutes les annonces passent par **la même fonction**, `calc()`, dans `src/js/00b-financement-impots.js`. Le site, l'app Android et le serveur MCP l'appellent tous les trois. Ce document décrit ce qu'elle compte. Les règles qui fixent les prix, les loyers et les autres entrées sont dans [REGLES.md](../REGLES.md).

> Ce sont des ordres de grandeur, avec les règles fiscales de 2026. Ce n'est pas un conseil fiscal.

## Les deux chiffres affichés

- **Rendement sur 15 ans** : le taux de rendement interne (TRI) de l'apport, revente comprise. Il est calculé sur les flux mensuels, puis ramené à l'année. Les flux sont :
  - l'apport, versé au départ ;
  - le cash-flow de chaque mois, impôts compris, pendant 15 ans ;
  - au dernier mois, le prix de revente, net des frais, du capital restant dû et de l'impôt sur la plus-value.
- **Cash-flow par mois** : ce qui reste chaque mois la première année. C'est le loyer encaissé (mois vides déduits), moins la gestion, la mensualité (assurance comprise), les charges, et un douzième de l'impôt et des frais de l'année.

Par défaut, les deux chiffres sont **après impôts**. Le réglage « net » permet de les voir avant impôts.

## Étapes

1. **Prix du bien.** C'est le prix de l'annonce, s'il y en a une. Sinon, c'est le prix au m² des ventes réelles (DVF) du quartier, pour ce type de bien, multiplié par la surface et corrigé de l'effet de la surface sur le prix au m².
2. **Budget tout compris.** On ajoute au prix les frais de notaire, les meubles et les travaux. Les travaux sont estimés d'après l'état lu dans l'annonce et le DPE ; un DPE F ou G compte sa rénovation. Enfin, la garantie du prêt : un pourcentage de la somme empruntée.
3. **Crédit.** On emprunte le budget moins l'apport. La mensualité est constante, et l'assurance de chaque emprunteur est comptée sur sa quotité.
4. **Loyer.**
   1. On part du loyer de référence de la ville, charges comprises.
   2. On le ramène à la surface du bien, puis on le recale sur les annonces de location du même type.
   3. On retire les charges payées par le locataire.
   4. On retire enfin les mois vides de la ville. Ils sont mesurés sur le relevé quotidien : le temps que les locations restent en ligne, comparé à la ville médiane.
5. **Charges du propriétaire.**
   - la copropriété : 35 % des charges annoncées, ou une estimation ;
   - les autres frais ;
   - une provision pour gros travaux ;
   - la taxe foncière, proportionnelle au taux de la commune et à la surface ;
   - la gestion par agence, si elle est réglée (une part du loyer encaissé).
6. **Évolution.** Les loyers, les charges et les prix évoluent chaque année. La hausse des prix d'une ville dépend de sa part de logements vides (Insee) : plus il y en a, plus la hausse est faible. L'écart est borné à ±2 points.
7. **Impôts (LMNP).** Les deux régimes sont simulés année par année, et le régime « auto » garde celui qui rapporte le plus.
   - **micro-BIC** : 50 % des recettes sont imposées.
   - **réel** : on déduit les charges, les intérêts, l'assurance, la CFE, le comptable, puis les frais de notaire et de garantie la première année. On amortit ensuite le bâti (85 % du prix, sur 30 ans), les meubles (7 ans) et les travaux (10 ans). L'amortissement ne crée pas de déficit : le surplus est reporté.
   - Chaque associé paie sur sa part, à sa tranche, plus les prélèvements sociaux (18,6 %).
   - Un bien vendu loué avec un bail vide en cours relève du micro-foncier (abattement de 30 %) jusqu'au départ du locataire.
8. **Revente.**
   - Le prix de vente suit l'évolution des prix, moins les frais de revente.
   - La plus-value des particuliers est imposée à 19 % plus 17,2 % de prélèvements sociaux, avec les abattements pour durée de détention.
   - Le prix d'achat est majoré des frais et des travaux, avec un forfait de 15 % après 5 ans.
   - Depuis 2025, les amortissements du bâti déduits au réel sont réintégrés dans la plus-value.
9. **Endettement** (ce que regarde la banque) : (mensualité + autres crédits) ÷ (revenus + 70 % du loyer). Il est donné pour l'ensemble des associés et pour chacun sur sa part.

## Valeurs par défaut

Chaque valeur se change dans Projet. Avec un groupe, les réglages sont partagés.

| Réglage | Défaut |
|---|---|
| apport | 15 000 € |
| taux du crédit, durée | 4,07 %, 25 ans |
| assurance de prêt | 0,20 % par an, quotité 100 % |
| garantie | 1 % de la somme empruntée |
| frais de notaire | 8 % |
| meubles, travaux (studio) | 3 000 €, 2 300 € (puis estimés par annonce) |
| mois vides | 1 par an dans la ville médiane (puis mesurés par ville) |
| hausse des prix, des loyers, des charges | +1 %, +1,5 %, +2 % par an |
| frais de revente | 3 % |
| CFE, comptable (réel) | 100 €, 150 € par an |
| gestion par agence | 0 (gestion par nous-mêmes) |
| durée de détention | 15 ans |

## Scénarios

| Scénario | Loyer | Mois vides | Évolution des prix |
|---|---|---|---|
| prudent | −5 % | +½ mois par an | −0,5 point par an |
| central | réglages | réglages | réglages |
| favorable | +5 % | −½ mois par an | +0,5 point par an |

## Le chiffre d'une ville

Une ville prend le chiffre de son **quartier du milieu**. Les quartiers sont classés par rendement, chacun pesant selon son nombre de ventes du type. La moitié des ventes se font dans des quartiers au rendement plus haut, l'autre moitié plus bas. Une ville sans quartier chiffré prend la moyenne de la ville.

## Cas particuliers

- **Bien vendu loué.** Le loyer du bail court jusqu'au départ du locataire. Si la fin n'est pas écrite, on compte 3 ans. Ensuite, le loyer est relevé de la prime d'un meublé, sans dépasser l'estimation.
- **Zone tendue** (Rennes, Nantes, Caen, Orléans, Saint-Nazaire). À la relocation, le loyer ne peut pas dépasser l'ancien.
- **Hors calcul**, avec une étiquette :
  - résidences gérées ;
  - viagers ;
  - biens non louables (insalubres, moins de 9 m² habitables) ;
  - prix anormaux (sous le quart des ventes réelles de la ville).

## Vérifier

Le calcul fiscal et financier est couvert par `tests/unit.js` : régimes, amortissements, plus-value, associés et TRI comparé à l'ancienne méthode. Voir [tests.md](tests.md).
