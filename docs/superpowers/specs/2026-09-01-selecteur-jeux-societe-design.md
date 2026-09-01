# Sélecteur de jeux de société — conception

## Objectif

Un site statique publié sur GitHub Pages qui aide à choisir quel jeu sortir
parmi une collection personnelle, en répondant à quelques questions sur la
soirée : combien de joueurs, combien de temps, âge du plus jeune, coopératif
ou non, envie de complexité.

Le site ne décide pas à la place du joueur. Il classe la collection par
affinité avec la soirée et explique chaque classement, pour que le choix final
reste humain.

## Deux modes

**Choisir vite** — assistant orienté mobile, une question par écran, pour la
décision autour de la table.

**Collection** — liste filtrable et triable, orientée desktop, pour explorer
ou consulter la collection.

Les deux modes partagent le chargement des données et le rendu d'une fiche de
jeu. Ils ne partagent pas leur logique : l'assistant **classe** par score, la
collection **filtre** de façon binaire. Les unifier produirait une interface
qui fait mal les deux.

## Modèle de données

`data/games.json` contient un tableau de fiches :

```json
{
  "id": "spirit-island",
  "nom": "Spirit Island",
  "joueursMin": 1,
  "joueursMax": 4,
  "joueursIdeal": [2, 3],
  "dureeMin": 90,
  "dureeMax": 120,
  "ageMin": 13,
  "type": "coop",
  "complexite": 4.0,
  "tags": ["gestion", "asymétrique", "puzzle"]
}
```

| Champ | Type | Règle |
|---|---|---|
| `id` | string | slug unique, dérivé du nom |
| `nom` | string | obligatoire |
| `joueursMin` / `joueursMax` | entier | `joueursMin ≤ joueursMax` |
| `joueursIdeal` | tableau d'entiers | configurations où le jeu est à son meilleur ; peut être vide |
| `dureeMin` / `dureeMax` | entier, minutes | `dureeMin ≤ dureeMax` |
| `ageMin` | entier | âge minimum conseillé |
| `type` | énum | `coop`, `competitif`, `semi-coop`, `un-contre-tous` |
| `complexite` | décimal 1–5 | échelle de type « weight » BGG |
| `tags` | tableau de strings | libre, en minuscules |

Les données sont saisies à la main. Chaque champ ajouté coûte du temps
multiplié par le nombre de jeux, d'où ce modèle volontairement maigre.

## Calcul du score

Le score guide l'assistant uniquement. Il n'intervient pas dans le mode
Collection.

### Filtre dur

Le nombre de joueurs est le seul critère éliminatoire : un jeu est écarté si
`joueursMin > N` ou `joueursMax < N`. Un jeu physiquement injouable ne doit
pas apparaître, même mal classé.

Tous les autres critères dégradent le score sans jamais exclure.

### Sous-scores

Chaque critère produit une valeur entre 0 et 1.

**Joueurs** — 1 si `N` figure dans `joueursIdeal`, 0.6 sinon.

**Durée** — soit `T` le temps disponible en minutes. 1 si `dureeMax ≤ T`,
sinon `max(0, 1 − (dureeMax − T) / T)`. Le score atteint 0 quand le jeu dure
le double du temps disponible. Un jeu plus court que le budget n'est jamais
pénalisé.

**Âge** — soit `A` l'âge du plus jeune. 1 si `ageMin ≤ A`, sinon
`max(0, 1 − 0.15 × (ageMin − A))`. Un jeu 8+ avec un enfant de 7 ans donne
0.85.

**Type** — 1 si le type demandé correspond exactement. 0.6 si le jeu est
`semi-coop` et que la demande est `coop` ou `competitif`. 0.2 sinon.

**Complexité** — trois intervalles : léger `[1, 2.5]`, moyen `]2.5, 3.5]`,
costaud `]3.5, 5]`. 1 si `complexite` tombe dans l'intervalle demandé, sinon
`max(0, 1 − 0.25 × écart)`, où l'écart est la distance à la borne la plus
proche de cet intervalle.

### Pondération

| Critère | Poids |
|---|---|
| Joueurs | 1 |
| Durée | 1 |
| Âge | 1.5 |
| Type | 1.5 |
| Complexité | 1 |

Âge et type pèsent le double : dépasser d'une demi-heure se négocie autour de
la table, imposer du compétitif à un groupe qui veut du coop, non.

Score final = `somme(poids × sous-score) / somme(poids) × 100`, arrondi à
l'entier.

### « Peu importe »

Une réponse « peu importe » met le poids du critère à **zéro** : il disparaît
du numérateur et du dénominateur. Le compter comme neutre pénaliserait tous
les jeux également et diluerait les critères réellement exprimés.

« Que des adultes » et « plus de 90 minutes » suppriment de la même façon
toute contrainte d'âge et de durée.

### Explication du score

Chaque sous-score inférieur à 1 produit un message lisible attaché au
résultat : « 13+ pour un enfant de 9 ans », « 120 min pour 60 min
disponibles », « compétitif alors que vous vouliez du coopératif ».

Un pourcentage sans justification est une boîte noire. Comme l'objectif est
que l'utilisateur choisisse lui-même, l'explication n'est pas un ornement :
c'est la sortie utile de l'application.

### Réglages

Poids, pentes de dégradation et bornes de complexité vivent dans un unique
objet de configuration en tête de `js/scoring.js`, jamais dispersés dans le
code. Ce sont des réglages qui ne se trouvent qu'à l'usage.

## Assistant « Choisir vite »

Une question par écran, plein écran, gros boutons tactiles :

1. **Combien de joueurs ?** — 1, 2, 3, 4, 5, 6, 7+
2. **Combien de temps devant vous ?** — moins de 30 min, 30–60, 60–90, plus de 90, peu importe
3. **Âge du plus jeune ?** — 6, 8, 10, 12, 14, que des adultes
4. **Coop ou chacun pour soi ?** — coopératif, compétitif, peu importe
5. **Envie de se creuser la tête ?** — léger, moyen, costaud, peu importe

Les tranches de durée fixent `T` à 30, 60 ou 90 minutes ; « plus de 90 » et
« peu importe » suppriment la contrainte.

**Sortie anticipée.** Un bouton « Voir les N jeux » apparaît dès la question 1
répondue et reste visible ensuite, son compteur reflétant les jeux encore en
lice. Le nombre de joueurs suffit à produire un classement utile ; les autres
questions ne font que l'affiner. Personne ne doit répondre à cinq questions
pour obtenir une réponse.

**Résultats.** Les trois meilleurs jeux en grand, avec score et pénalités
expliquées, puis un bouton « voir tout le classement » qui déroule le reste.

**Révision.** Les réponses restent affichées en puces cliquables au-dessus des
résultats (« 4 joueurs · 60 min · 10 ans ») et se modifient sans recommencer
le parcours. Le retour arrière est libre à tout moment.

## Mode Collection

Liste de tous les jeux, triée alphabétiquement par défaut.

**Filtres binaires** — nombre de joueurs, durée, type, complexité, tags. Ici
le résultat doit être exact : la question posée est « montre-moi mes coops à
2 joueurs », pas « que jouer ce soir ». Aucun score n'intervient.

**Recherche** par nom, **tri** par nom, durée, complexité ou nombre de
joueurs.

Panneau de filtres à gauche sur desktop, replié en haut sur mobile.

Chaque ligne affiche nom, joueurs, durée, âge, type et complexité, et se
déplie en place pour montrer la fiche complète avec les tags. À l'échelle
d'une collection personnelle, un dépliant est plus rapide qu'une navigation
vers une page dédiée.

## Page d'administration

`admin.html`, publiée sur GitHub Pages mais absente de la navigation. La page
ne peut rien écrire sur le serveur : elle sait seulement lire le JSON publié
et produire un fichier à télécharger. L'exposer ne présente donc aucun risque,
et permet de saisir un jeu depuis n'importe quel appareil.

**Fonctions** — charger `data/games.json`, lister les fiches en édition,
ajouter, modifier, supprimer, puis télécharger le fichier complet, formaté et
trié par nom, prêt à remplacer celui du dépôt.

**Validation à la saisie** — `joueursMin ≤ joueursMax`, `dureeMin ≤ dureeMax`,
complexité entre 1 et 5, type parmi les quatre valeurs, `id` unique. Les tags
sont proposés en autocomplétion sur ceux déjà utilisés, pour éviter que
« gestion » et « Gestion » cohabitent.

**Protection du travail en cours.** Le danger de cette approche n'est pas
technique mais humain : saisir trois jeux, fermer l'onglet, tout perdre — ou
exporter, oublier de commiter, et repartir deux semaines plus tard du JSON
publié en croyant ses ajouts présents.

Trois garde-fous :

- le brouillon est enregistré dans `localStorage` à chaque modification ;
- un bandeau permanent signale l'écart avec le fichier publié
  (« 3 modifications non exportées ») ;
- au chargement, si un brouillon existe, la page demande explicitement quoi
  faire : reprendre le brouillon ou repartir du fichier publié.

L'objectif est de transformer une perte silencieuse en décision consciente.

## Structure technique

Pas de framework, pas d'étape de build, pas de dépendances. Des modules ES
natifs chargés directement par le navigateur. GitHub Pages sert le dépôt tel
quel : ce qui tourne en local est exactement ce qui est publié.

```
index.html          assistant + collection (une page, deux vues)
admin.html          saisie et export
css/style.css
js/data.js          chargement et validation du JSON
js/scoring.js       filtre dur et calcul de score — logique pure
js/assistant.js     parcours de questions
js/collection.js    filtres, tri, recherche
js/game-card.js     rendu d'une fiche, partagé
js/admin.js
data/games.json
```

`scoring.js` ne connaît ni le DOM ni le chargement du JSON. Il expose une
fonction qui reçoit une liste de jeux et un objet de réponses, et rend une
liste classée où chaque entrée porte son score et le détail de ses pénalités.
Cette frontière permet de faire évoluer la formule sans toucher à l'interface,
et inversement.

`data.js` est le seul module qui connaît l'origine des données. Le jour où
elles viendront d'ailleurs, lui seul changera.

## Gestion des erreurs

**JSON absent ou illisible** — le site affiche un message explicite à la place
de la liste, sans page blanche.

**Fiche invalide** — `data.js` écarte les fiches qui violent le modèle et
signale leur nombre dans la console. Une donnée mal saisie ne doit pas casser
l'affichage des autres.

**Aucun jeu ne passe le filtre dur** — l'assistant affiche « Aucun jeu ne se
joue à N joueurs » et propose de modifier cette réponse. C'est le seul écran
vide possible, et il est explicable.

## Déploiement

GitHub Pages depuis la racine de la branche principale. Aucune action, aucun
build.

## Données de départ

Sept jeux pour le MVP. Les valeurs ci-dessous sont un point de départ **à
vérifier et corriger** par le propriétaire de la collection ; elles sont
saisies de mémoire et ne proviennent pas d'une source faisant autorité.

| Jeu | Joueurs | Durée | Âge | Type | Complexité |
|---|---|---|---|---|---|
| Spirit Island | 1–4 | 90–120 | 13 | coop | 4.0 |
| Barrage | 1–4 | 60–120 | 14 | competitif | 4.1 |
| Sea Salt & Paper | 2–4 | 30–45 | 8 | competitif | 1.5 |
| Hitster | 2–10 | 20–30 | 10 | competitif | 1.0 |
| Too Many Bones | 1–4 | 60–120 | 14 | coop | 4.0 |
| Le Château Blanc | 1–4 | 60–80 | 12 | competitif | 2.9 |
| Ready Set Go | à renseigner | | | | |

« Ready Set Go » n'a pas été identifié avec certitude et doit être saisi
manuellement.

## Hors périmètre

**API BoardGameGeek.** Écartée après vérification : depuis 2025, l'API XML
exige une inscription et un token bearer dans l'en-tête `Authorization`, et un
appel non authentifié renvoie `401 Unauthorized`. Un site statique public ne
peut pas héberger ce token, et l'API ne renvoie pas d'en-têtes CORS. Un import
BGG imposerait donc un script hors ligne ou une GitHub Action. Les données
sont saisies à la main.

**Également hors périmètre :** images de boîtes, liens BGG, notes
personnelles, temps d'explication des règles, historique des parties,
extensions, backend, authentification, tests automatisés.

## Évolutions possibles

- Images de boîtes dans le mode Collection, via un champ `image` par jeu.
- Import BGG par script Node local, token en variable d'environnement,
  alimentant `games.json` sans passer par la page d'admin.
- Écriture directe dans le dépôt depuis la page d'admin, via l'API GitHub et
  un jeton personnel, supprimant l'étape de téléchargement et de commit.
- Tests sur `scoring.js` avec le lanceur intégré de Node, sans dépendance.
