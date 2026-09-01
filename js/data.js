export const CHEMIN_JSON = 'data/games.json';

export const TYPES = {
  coop: 'Coopératif',
  competitif: 'Compétitif',
  'semi-coop': 'Semi-coopératif',
  'un-contre-tous': 'Un contre tous',
};

export function valider(jeu) {
  const erreurs = [];
  const entier = (v) => Number.isInteger(v) && v > 0;

  if (!jeu.id || typeof jeu.id !== 'string') erreurs.push('id manquant');
  if (!jeu.nom || typeof jeu.nom !== 'string') erreurs.push('nom manquant');
  if (!entier(jeu.joueursMin) || !entier(jeu.joueursMax)) erreurs.push('nombre de joueurs invalide');
  else if (jeu.joueursMin > jeu.joueursMax) erreurs.push('joueursMin dépasse joueursMax');
  if (!entier(jeu.dureeMin) || !entier(jeu.dureeMax)) erreurs.push('durée invalide');
  else if (jeu.dureeMin > jeu.dureeMax) erreurs.push('dureeMin dépasse dureeMax');
  if (!entier(jeu.ageMin)) erreurs.push('âge minimum invalide');
  if (!(jeu.type in TYPES)) erreurs.push('type inconnu');
  if (typeof jeu.complexite !== 'number' || jeu.complexite < 1 || jeu.complexite > 5) {
    erreurs.push('complexité hors de 1–5');
  }
  if (!Array.isArray(jeu.joueursIdeal)) erreurs.push('joueursIdeal doit être une liste');
  if (!Array.isArray(jeu.tags)) erreurs.push('tags doit être une liste');
  if (jeu.image != null && typeof jeu.image !== 'string') erreurs.push('image doit être un chemin');
  if (jeu.bggId != null && !entier(jeu.bggId)) erreurs.push('bggId doit être un entier');

  return erreurs;
}

export function trierParNom(jeux) {
  return [...jeux].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

export function tousLesTags(jeux) {
  return [...new Set(jeux.flatMap((jeu) => jeu.tags))].sort((a, b) => a.localeCompare(b, 'fr'));
}

export async function chargerJeux(chemin = CHEMIN_JSON) {
  const reponse = await fetch(chemin, { cache: 'no-cache' });
  if (!reponse.ok) throw new Error(`${chemin} introuvable (HTTP ${reponse.status})`);

  const brut = await reponse.json();
  if (!Array.isArray(brut)) throw new Error(`${chemin} ne contient pas une liste de jeux`);

  const jeux = [];
  const invalides = [];
  for (const jeu of brut) {
    const erreurs = valider(jeu);
    if (erreurs.length) invalides.push({ jeu, erreurs });
    else jeux.push(jeu);
  }

  if (invalides.length) {
    console.warn(`${invalides.length} fiche(s) écartée(s) :`, invalides);
  }

  return { jeux: trierParNom(jeux), invalides };
}
