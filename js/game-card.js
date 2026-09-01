import { TYPES } from './data.js';

export function echapper(texte) {
  return String(texte).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export const libelleJoueurs = (jeu) =>
  jeu.joueursMin === jeu.joueursMax
    ? `${jeu.joueursMin} joueur${jeu.joueursMin > 1 ? 's' : ''}`
    : `${jeu.joueursMin}–${jeu.joueursMax} joueurs`;

export const libelleDuree = (jeu) =>
  jeu.dureeMin === jeu.dureeMax ? `${jeu.dureeMin} min` : `${jeu.dureeMin}–${jeu.dureeMax} min`;

export const libelleAge = (jeu) => `${jeu.ageMin}+`;

export const libelleComplexite = (jeu) => `${jeu.complexite.toFixed(1)}/5`;

function tags(jeu, cliquables = false) {
  if (!jeu.tags.length) return '';
  const contenu = (tag) =>
    cliquables
      ? `<button type="button" class="tag" data-tag="${echapper(tag)}">${echapper(tag)}</button>`
      : `<span class="tag">${echapper(tag)}</span>`;
  return `<ul class="tags">${jeu.tags.map((tag) => `<li>${contenu(tag)}</li>`).join('')}</ul>`;
}

// alt vide : le nom du jeu est juste à côté, répéter la boîte n'apporte rien au lecteur d'écran.
function vignette(jeu) {
  if (!jeu.image) return '';
  return `<img class="vignette" src="${echapper(jeu.image)}" alt="" loading="lazy">`;
}

// rel="noopener" : sans lui, la page ouverte garde une référence sur la nôtre via window.opener.
function lienBgg(jeu) {
  if (!jeu.bggId) return '';
  return `<a class="lien-bgg" href="https://boardgamegeek.com/boardgame/${jeu.bggId}"
    target="_blank" rel="noopener noreferrer">Voir sur BGG</a>`;
}

function meta(jeu) {
  return `<ul class="meta">
    <li>${libelleJoueurs(jeu)}</li>
    <li>${libelleDuree(jeu)}</li>
    <li>${libelleAge(jeu)}</li>
    <li>${echapper(TYPES[jeu.type])}</li>
    <li>Complexité ${libelleComplexite(jeu)}</li>
  </ul>`;
}

export function carteResultat({ jeu, score, penalites }, { compacte = false } = {}) {
  const reserves = penalites.length
    ? `<ul class="penalites">${penalites
        .map((p) => `<li>${echapper(p)}</li>`)
        .join('')}</ul>`
    : '<p class="sans-reserve">Correspond à tous vos critères</p>';

  return `<article class="resultat${compacte ? ' compacte' : ''}">
    ${vignette(jeu)}
    <div class="corps">
      <header>
        <h3>${echapper(jeu.nom)}</h3>
        <p class="score" aria-label="Score de correspondance : ${score} sur 100">${score}<span>%</span></p>
      </header>
      ${meta(jeu)}
      ${reserves}
      ${compacte ? '' : tags(jeu)}
    </div>
  </article>`;
}

export function ligneCollection(jeu) {
  return `<details class="ligne">
    <summary>
      ${vignette(jeu)}
      <div class="corps">
        <span class="nom">${echapper(jeu.nom)}</span>
        ${meta(jeu)}
      </div>
    </summary>
    <div class="pied">
      ${tags(jeu, true) || '<p class="sans-reserve">Aucun tag</p>'}
      ${lienBgg(jeu)}
    </div>
  </details>`;
}
