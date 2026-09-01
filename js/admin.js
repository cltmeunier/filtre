import { CHEMIN_JSON, TYPES, valider, trierParNom, tousLesTags } from './data.js';
import { echapper } from './game-card.js';

const CLE_BROUILLON = 'jeux:brouillon';
const ORDRE_CHAMPS = [
  'id',
  'nom',
  'joueursMin',
  'joueursMax',
  'joueursIdeal',
  'dureeMin',
  'dureeMax',
  'ageMin',
  'type',
  'complexite',
  'tags',
  'bggId',
  'image',
];

const slug = (nom) =>
  nom
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const listeNombres = (texte) =>
  texte
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(Number)
    .filter(Number.isInteger);

const listeTextes = (texte) =>
  texte
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

// Ordre de clés stable : sinon la comparaison au fichier publié voit des écarts fantômes.
function normaliser(jeu) {
  return Object.fromEntries(ORDRE_CHAMPS.map((champ) => [champ, jeu[champ]]));
}

function empreinte(jeux) {
  return new Map(trierParNom(jeux).map((jeu) => [jeu.id, JSON.stringify(normaliser(jeu))]));
}

function compterEcarts(publie, courant) {
  const avant = empreinte(publie);
  const apres = empreinte(courant);
  let ecarts = 0;
  for (const [id, texte] of apres) if (avant.get(id) !== texte) ecarts += 1;
  for (const id of avant.keys()) if (!apres.has(id)) ecarts += 1;
  return ecarts;
}

export async function initAdmin(racine) {
  const zoneChoix = racine.querySelector('[data-choix]');
  const zoneBandeau = racine.querySelector('[data-bandeau]');
  const zoneFormulaire = racine.querySelector('[data-formulaire]');
  const zoneListe = racine.querySelector('[data-liste]');
  const zoneErreurs = racine.querySelector('[data-erreurs]');

  const reponse = await fetch(CHEMIN_JSON, { cache: 'no-cache' });
  if (!reponse.ok) throw new Error(`${CHEMIN_JSON} introuvable (HTTP ${reponse.status})`);
  const publie = await reponse.json();

  let jeux = publie.map(normaliser);
  let edition = null;

  const brouillon = lireBrouillon();
  if (brouillon && compterEcarts(publie, brouillon)) {
    zoneChoix.hidden = false;
    zoneChoix.innerHTML = `
      <p>Un brouillon non exporté existe sur cet appareil
        (${compterEcarts(publie, brouillon)} modification(s)).</p>
      <button type="button" data-reprendre class="primaire">Reprendre le brouillon</button>
      <button type="button" data-ignorer class="lien">Repartir du fichier publié</button>`;
    await new Promise((resoudre) => {
      zoneChoix.addEventListener('click', (evenement) => {
        if (evenement.target.matches('[data-reprendre]')) {
          jeux = brouillon.map(normaliser);
        } else if (evenement.target.matches('[data-ignorer]')) {
          localStorage.removeItem(CLE_BROUILLON);
        } else {
          return;
        }
        zoneChoix.hidden = true;
        resoudre();
      });
    });
  }

  function lireBrouillon() {
    try {
      const brut = localStorage.getItem(CLE_BROUILLON);
      return brut ? JSON.parse(brut) : null;
    } catch {
      return null;
    }
  }

  function enregistrerBrouillon() {
    try {
      localStorage.setItem(CLE_BROUILLON, JSON.stringify(jeux));
    } catch (erreur) {
      console.warn('Brouillon non enregistré', erreur);
    }
  }

  function rendreBandeau() {
    const ecarts = compterEcarts(publie, jeux);
    zoneBandeau.hidden = ecarts === 0;
    zoneBandeau.textContent = `${ecarts} modification${ecarts > 1 ? 's' : ''} non exportée${
      ecarts > 1 ? 's' : ''
    } — pensez à télécharger puis commiter games.json.`;
  }

  function rendreFormulaire() {
    const jeu = edition ? jeux.find((j) => j.id === edition) : null;
    const v = (champ, defaut = '') => echapper(jeu?.[champ] ?? defaut);

    zoneFormulaire.innerHTML = `
      <h2>${jeu ? `Modifier « ${echapper(jeu.nom)} »` : 'Ajouter un jeu'}</h2>
      <form data-saisie>
        <label>Nom<input name="nom" value="${v('nom')}" required></label>
        <label>Identifiant<input name="id" value="${v('id')}" placeholder="généré depuis le nom"></label>
        <label>Joueurs min<input name="joueursMin" type="number" min="1" value="${v('joueursMin', 1)}"></label>
        <label>Joueurs max<input name="joueursMax" type="number" min="1" value="${v('joueursMax', 4)}"></label>
        <label>Joueurs idéal<input name="joueursIdeal" value="${echapper((jeu?.joueursIdeal ?? []).join(', '))}" placeholder="2, 3"></label>
        <label>Durée min (min)<input name="dureeMin" type="number" min="1" value="${v('dureeMin', 30)}"></label>
        <label>Durée max (min)<input name="dureeMax" type="number" min="1" value="${v('dureeMax', 60)}"></label>
        <label>Âge minimum<input name="ageMin" type="number" min="1" value="${v('ageMin', 8)}"></label>
        <label>Type<select name="type">${Object.entries(TYPES)
          .map(
            ([valeur, libelle]) =>
              `<option value="${valeur}"${jeu?.type === valeur ? ' selected' : ''}>${echapper(libelle)}</option>`,
          )
          .join('')}</select></label>
        <label>Complexité (1 à 5)<input name="complexite" type="number" step="0.1" min="1" max="5" value="${v('complexite', 2.5)}"></label>
        <label>Tags<input name="tags" list="tags-connus" value="${echapper((jeu?.tags ?? []).join(', '))}" placeholder="gestion, cartes"></label>
        <label>Identifiant BGG<input name="bggId" type="number" min="1" value="${v('bggId')}" placeholder="342942"></label>
        <label>Image<input name="image" value="${v('image')}" placeholder="img/nom-du-jeu.jpg"></label>
        <datalist id="tags-connus">${tousLesTags(jeux)
          .map((tag) => `<option value="${echapper(tag)}">`)
          .join('')}</datalist>
        <div class="pilotage">
          <button type="submit" class="primaire">${jeu ? 'Enregistrer' : 'Ajouter'}</button>
          ${edition ? '<button type="button" data-annuler class="lien">Annuler</button>' : ''}
        </div>
      </form>`;
  }

  function rendreListe() {
    zoneListe.innerHTML = trierParNom(jeux)
      .map(
        (jeu) => `<li>
          <span>${echapper(jeu.nom)}</span>
          <span class="detail">${jeu.joueursMin}–${jeu.joueursMax} j · ${jeu.dureeMin}–${jeu.dureeMax} min · ${echapper(TYPES[jeu.type])}</span>
          <button type="button" data-modifier="${echapper(jeu.id)}" class="lien">Modifier</button>
          <button type="button" data-supprimer="${echapper(jeu.id)}" class="lien">Supprimer</button>
        </li>`,
      )
      .join('');
  }

  function rendre() {
    rendreBandeau();
    rendreFormulaire();
    rendreListe();
  }

  function lireSaisie(formulaire) {
    const donnees = new FormData(formulaire);
    const nom = donnees.get('nom').trim();
    return normaliser({
      id: donnees.get('id').trim() || slug(nom),
      nom,
      joueursMin: Number(donnees.get('joueursMin')),
      joueursMax: Number(donnees.get('joueursMax')),
      joueursIdeal: listeNombres(donnees.get('joueursIdeal')),
      dureeMin: Number(donnees.get('dureeMin')),
      dureeMax: Number(donnees.get('dureeMax')),
      ageMin: Number(donnees.get('ageMin')),
      type: donnees.get('type'),
      complexite: Number(donnees.get('complexite')),
      tags: listeTextes(donnees.get('tags')),
      bggId: Number(donnees.get('bggId')) || undefined,
      image: donnees.get('image').trim() || undefined,
    });
  }

  zoneFormulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    const jeu = lireSaisie(evenement.target);
    const erreurs = valider(jeu);
    if (jeux.some((j) => j.id === jeu.id && j.id !== edition)) {
      erreurs.push(`l’identifiant « ${jeu.id} » est déjà utilisé`);
    }

    zoneErreurs.hidden = !erreurs.length;
    zoneErreurs.innerHTML = erreurs.map((e) => `<li>${echapper(e)}</li>`).join('');
    if (erreurs.length) return;

    jeux = edition ? jeux.map((j) => (j.id === edition ? jeu : j)) : [...jeux, jeu];
    edition = null;
    enregistrerBrouillon();
    rendre();
  });

  zoneFormulaire.addEventListener('click', (evenement) => {
    if (!evenement.target.matches('[data-annuler]')) return;
    edition = null;
    zoneErreurs.hidden = true;
    rendre();
  });

  zoneListe.addEventListener('click', (evenement) => {
    const bouton = evenement.target.closest('button');
    if (!bouton) return;

    if (bouton.dataset.modifier) {
      edition = bouton.dataset.modifier;
      zoneErreurs.hidden = true;
    } else if (bouton.dataset.supprimer) {
      const jeu = jeux.find((j) => j.id === bouton.dataset.supprimer);
      if (!confirm(`Supprimer « ${jeu.nom} » de la collection ?`)) return;
      jeux = jeux.filter((j) => j.id !== jeu.id);
      if (edition === jeu.id) edition = null;
      enregistrerBrouillon();
    } else {
      return;
    }
    rendre();
  });

  racine.querySelector('[data-exporter]').addEventListener('click', () => {
    const contenu = `${JSON.stringify(trierParNom(jeux).map(normaliser), null, 2)}\n`;
    const lien = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([contenu], { type: 'application/json' })),
      download: 'games.json',
    });
    lien.click();
    URL.revokeObjectURL(lien.href);
  });

  rendre();
}
