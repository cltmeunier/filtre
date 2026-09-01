# Quel jeu ce soir ?

Site statique qui aide à choisir un jeu dans une collection personnelle, en
répondant à quelques questions sur la soirée.

Aucune dépendance, aucune étape de build : des modules ES natifs servis tels
quels. La conception complète est dans
[`docs/superpowers/specs/2026-09-01-selecteur-jeux-societe-design.md`](docs/superpowers/specs/2026-09-01-selecteur-jeux-societe-design.md).

## Consulter en local

Les modules ES exigent un vrai serveur ; ouvrir `index.html` par
`file://` ne fonctionne pas.

```sh
python3 -m http.server 8000
```

Puis <http://localhost:8000/>.

## Publier sur GitHub Pages

Dans les réglages du dépôt, section *Pages* : source « Deploy from a branch »,
branche principale, dossier `/ (root)`. Aucun workflow à écrire.

## Ajouter ou modifier un jeu

La page `admin.html` sert à saisir les fiches. Elle ne peut rien écrire sur le
serveur : elle lit `data/games.json`, vous laissez modifier la collection, puis
elle vous fait **télécharger** le fichier complet.

1. Ouvrir `/admin.html`.
2. Ajouter, modifier ou supprimer des jeux.
3. Cliquer sur **Télécharger games.json**.
4. Remplacer `data/games.json` par le fichier téléchargé, puis commiter.

Tant que l'étape 4 n'est pas faite, le travail vit uniquement dans le
`localStorage` du navigateur. La page affiche en permanence le nombre de
modifications non exportées, et propose de reprendre le brouillon à la
prochaine ouverture.

## Images de boîtes

Le champ `image` d'une fiche est facultatif. Déposez le fichier dans `img/`,
puis renseignez son chemin dans la page d'admin (`img/spirit-island.jpg`). Une
URL complète fonctionne aussi.

La vignette apparaît dans la liste de la collection et sur les résultats de
l'assistant. Un chemin absent ou introuvable ne casse rien : la vignette
disparaît, la fiche reste lisible.

## Réglage du classement

Les poids et les pentes de dégradation du score sont regroupés dans l'objet
`CONFIG` en tête de [`js/scoring.js`](js/scoring.js). C'est le seul endroit à
modifier pour ajuster le classement après quelques parties.
