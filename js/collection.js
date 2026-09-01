import { tousLesTags } from './data.js';
import { CONFIG, jouableA } from './scoring.js';
import { ligneCollection, echapper } from './game-card.js';

const sansAccent = (texte) =>
  texte
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const TRIS = {
  nom: (a, b) => a.nom.localeCompare(b.nom, 'fr'),
  duree: (a, b) => a.dureeMax - b.dureeMax,
  complexite: (a, b) => a.complexite - b.complexite,
  joueurs: (a, b) => a.joueursMax - b.joueursMax,
};

const DUREES = {
  '30': (jeu) => jeu.dureeMax <= 30,
  '60': (jeu) => jeu.dureeMax <= 60,
  '90': (jeu) => jeu.dureeMax <= 90,
  plus: (jeu) => jeu.dureeMax > 90,
};

export function initCollection(racine, jeux) {
  const formulaire = racine.querySelector('[data-filtres]');
  const liste = racine.querySelector('[data-liste]');
  const compteur = racine.querySelector('[data-compteur]');
  const propositions = racine.querySelector('[data-tags]');
  const zoneActifs = racine.querySelector('[data-actifs]');
  const { recherche, joueurs, duree, type, complexite, tagSaisie } = formulaire.elements;

  const catalogue = tousLesTags(jeux);
  const tagsActifs = new Set();
  let signatureTags = null;

  // Reconstruire le datalist à chaque frappe referme le menu d'autocomplétion du navigateur.
  function rendrePropositions() {
    const signature = [...tagsActifs].join('|');
    if (signature === signatureTags) return;
    signatureTags = signature;
    propositions.innerHTML = catalogue
      .filter((tag) => !tagsActifs.has(tag))
      .map((tag) => `<option value="${echapper(tag)}">`)
      .join('');
  }

  function filtrer() {
    const cherche = sansAccent(recherche.value.trim());
    return jeux.filter((jeu) => {
      if (cherche && !sansAccent(jeu.nom).includes(cherche)) return false;
      if (joueurs.value && !jouableA(jeu, Number(joueurs.value))) return false;
      if (duree.value && !DUREES[duree.value](jeu)) return false;
      if (type.value && jeu.type !== type.value) return false;
      if (complexite.value) {
        const { min, max } = CONFIG.intervallesComplexite[complexite.value];
        if (jeu.complexite < min || jeu.complexite > max) return false;
      }
      return [...tagsActifs].every((tag) => jeu.tags.includes(tag));
    });
  }

  function puces() {
    const actifs = [];
    if (recherche.value.trim()) actifs.push(['recherche', `« ${recherche.value.trim()} »`]);
    if (joueurs.value) actifs.push(['joueurs', `${joueurs.value} joueurs`]);
    for (const champ of [duree, type]) {
      if (champ.value) actifs.push([champ.name, champ.selectedOptions[0].textContent.trim()]);
    }
    if (complexite.value) {
      actifs.push(['complexite', `Complexité ${complexite.selectedOptions[0].textContent.trim().toLowerCase()}`]);
    }
    for (const tag of tagsActifs) actifs.push([`tag:${tag}`, tag]);
    return actifs;
  }

  function rendreActifs() {
    const actifs = puces();
    zoneActifs.hidden = actifs.length === 0;
    zoneActifs.innerHTML = `${actifs
      .map(
        ([cle, libelle]) =>
          `<button type="button" class="puce" data-retirer="${echapper(cle)}">
             ${echapper(libelle)}<span aria-hidden="true">×</span>
             <span class="hors-ecran">retirer ce filtre</span>
           </button>`,
      )
      .join('')}
      ${actifs.length > 1 ? '<button type="button" class="lien" data-tout-effacer>Tout effacer</button>' : ''}`;
  }

  function rendre() {
    const retenus = filtrer().sort(TRIS[formulaire.elements.tri.value]);
    compteur.textContent = `${retenus.length} jeu${retenus.length > 1 ? 'x' : ''} sur ${jeux.length}`;
    liste.innerHTML = retenus.length
      ? retenus.map(ligneCollection).join('')
      : '<p class="vide">Aucun jeu ne correspond à ces filtres.</p>';

    for (const bouton of liste.querySelectorAll('[data-tag]')) {
      bouton.classList.toggle('actif', tagsActifs.has(bouton.dataset.tag));
    }

    rendrePropositions();
    rendreActifs();
  }

  function ajouterTag(saisie) {
    const cible = catalogue.find((tag) => sansAccent(tag) === sansAccent(saisie.trim()));
    if (!cible || tagsActifs.has(cible)) return false;
    tagsActifs.add(cible);
    return true;
  }

  // Sans submit-bloqué, la touche Entrée dans un champ texte rechargerait la page.
  formulaire.addEventListener('submit', (evenement) => evenement.preventDefault());

  formulaire.addEventListener('input', (evenement) => {
    if (evenement.target === tagSaisie) {
      if (!ajouterTag(tagSaisie.value)) return;
      tagSaisie.value = '';
    }
    rendre();
  });

  formulaire.addEventListener('keydown', (evenement) => {
    if (evenement.target !== tagSaisie || evenement.key !== 'Enter') return;
    evenement.preventDefault();
    if (ajouterTag(tagSaisie.value)) {
      tagSaisie.value = '';
      rendre();
    }
  });

  formulaire.addEventListener('reset', () =>
    setTimeout(() => {
      tagsActifs.clear();
      rendre();
    }),
  );

  liste.addEventListener('click', (evenement) => {
    const bouton = evenement.target.closest('[data-tag]');
    if (!bouton) return;
    const tag = bouton.dataset.tag;
    if (!tagsActifs.delete(tag)) tagsActifs.add(tag);
    rendre();
  });

  zoneActifs.addEventListener('click', (evenement) => {
    const bouton = evenement.target.closest('button');
    if (!bouton) return;

    if (bouton.dataset.toutEffacer !== undefined) {
      tagsActifs.clear();
      formulaire.reset();
    } else if (bouton.dataset.retirer?.startsWith('tag:')) {
      tagsActifs.delete(bouton.dataset.retirer.slice(4));
    } else if (bouton.dataset.retirer) {
      formulaire.elements[bouton.dataset.retirer].value = '';
    } else {
      return;
    }
    rendre();
  });

  rendre();
}
