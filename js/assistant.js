import { classer, jouableA } from './scoring.js';
import { carteResultat, echapper } from './game-card.js';

const PEU_IMPORTE = { label: 'Peu importe', valeur: null, resume: null };

const QUESTIONS = [
  {
    cle: 'joueurs',
    titre: 'Combien de joueurs ?',
    options: [
      ...[1, 2, 3, 4, 5, 6].map((n) => ({
        label: String(n),
        valeur: n,
        resume: `${n} joueur${n > 1 ? 's' : ''}`,
      })),
      { label: '7 +', valeur: 7, resume: '7 joueurs ou plus' },
    ],
  },
  {
    cle: 'duree',
    titre: 'Temps de jeu maximum ?',
    options: [
      { label: '30 min', valeur: 30, resume: '30 min max' },
      { label: '45 min', valeur: 45, resume: '45 min max' },
      { label: '1 h', valeur: 60, resume: '1 h max' },
      { label: '1 h 30', valeur: 90, resume: '1 h 30 max' },
      { label: '2 h', valeur: 120, resume: '2 h max' },
      PEU_IMPORTE,
    ],
  },
  {
    cle: 'age',
    titre: 'Quel âge a le plus jeune ?',
    options: [
      ...[6, 8, 10, 12, 14].map((n) => ({ label: `${n} ans`, valeur: n, resume: `${n} ans` })),
      { label: 'Que des adultes', valeur: null, resume: null },
    ],
  },
  {
    cle: 'type',
    titre: 'Coop ou chacun pour soi ?',
    options: [
      { label: 'Coopératif', valeur: 'coop', resume: 'coopératif' },
      { label: 'Compétitif', valeur: 'competitif', resume: 'compétitif' },
      PEU_IMPORTE,
    ],
  },
  {
    cle: 'complexite',
    titre: 'Envie de se creuser la tête ?',
    options: [
      { label: 'Léger', valeur: 'leger', resume: 'léger' },
      { label: 'Moyen', valeur: 'moyen', resume: 'moyen' },
      { label: 'Costaud', valeur: 'costaud', resume: 'costaud' },
      PEU_IMPORTE,
    ],
  },
];

export function initAssistant(conteneur, jeux) {
  const selection = {};
  let etape = 0;
  let toutAfficher = false;
  let revientAuxResultats = false;

  const reponses = () =>
    Object.fromEntries(QUESTIONS.map(({ cle }) => [cle, selection[cle]?.valeur ?? null]));

  const candidats = () =>
    selection.joueurs ? jeux.filter((jeu) => jouableA(jeu, selection.joueurs.valeur)) : jeux;

  function rendreQuestion() {
    const question = QUESTIONS[etape];
    const choisi = selection[question.cle];
    const restants = candidats().length;

    return `
      <p class="progression">Question ${etape + 1} sur ${QUESTIONS.length}</p>
      <h2>${echapper(question.titre)}</h2>
      <div class="choix">
        ${question.options
          .map(
            (option, i) => `<button type="button" data-option="${i}"
              class="${choisi === option ? 'actif' : ''}">${echapper(option.label)}</button>`,
          )
          .join('')}
      </div>
      <nav class="pilotage">
        ${etape > 0 ? '<button type="button" data-action="retour" class="lien">Retour</button>' : ''}
        ${
          selection.joueurs
            ? `<button type="button" data-action="resultats" class="primaire">
                 Voir les ${restants} jeu${restants > 1 ? 'x' : ''}
               </button>`
            : ''
        }
      </nav>`;
  }

  function rendreRappel() {
    const puces = QUESTIONS.map((question, i) => ({ question, i }))
      .filter(({ question }) => selection[question.cle]?.resume)
      .map(
        ({ question, i }) =>
          `<button type="button" data-question="${i}">${echapper(selection[question.cle].resume)}</button>`,
      )
      .join('');
    return `<div class="rappel">${puces}
      <button type="button" data-action="recommencer" class="lien">Recommencer</button></div>`;
  }

  function rendreResultats() {
    const classement = classer(jeux, reponses());

    if (!classement.length) {
      return `${rendreRappel()}
        <p class="vide">Aucun jeu de la collection ne se joue à ${selection.joueurs.valeur} joueurs.</p>
        <button type="button" data-question="0" class="primaire">Changer le nombre de joueurs</button>`;
    }

    const meilleur = classement[0].score;
    const tete = classement.filter((r) => r.score === meilleur);
    const visibles = toutAfficher ? classement : tete;
    const reste = classement.length - visibles.length;

    return `${rendreRappel()}
      <p class="tete-classement">${tete.length} jeu${tete.length > 1 ? 'x' : ''} à ${meilleur} %</p>
      <div class="resultats">
        ${visibles.map((r) => carteResultat(r, { compacte: r.score !== meilleur })).join('')}
      </div>
      ${
        reste > 0
          ? `<button type="button" data-action="tout" class="lien">
               Voir tout le classement (${reste} de plus)
             </button>`
          : ''
      }`;
  }

  function rendre() {
    conteneur.innerHTML = etape === 'resultats' ? rendreResultats() : rendreQuestion();
  }

  conteneur.addEventListener('click', (evenement) => {
    const bouton = evenement.target.closest('button');
    if (!bouton) return;

    if (bouton.dataset.option !== undefined) {
      const question = QUESTIONS[etape];
      selection[question.cle] = question.options[Number(bouton.dataset.option)];
      if (revientAuxResultats) etape = 'resultats';
      else etape = etape + 1 < QUESTIONS.length ? etape + 1 : 'resultats';
      revientAuxResultats = false;
    } else if (bouton.dataset.question !== undefined) {
      revientAuxResultats = etape === 'resultats';
      etape = Number(bouton.dataset.question);
    } else if (bouton.dataset.action === 'retour') {
      etape -= 1;
      revientAuxResultats = false;
    } else if (bouton.dataset.action === 'resultats') {
      etape = 'resultats';
      toutAfficher = false;
    } else if (bouton.dataset.action === 'tout') {
      toutAfficher = true;
    } else if (bouton.dataset.action === 'recommencer') {
      for (const { cle } of QUESTIONS) delete selection[cle];
      etape = 0;
      toutAfficher = false;
      revientAuxResultats = false;
    } else {
      return;
    }

    rendre();
  });

  rendre();
}
