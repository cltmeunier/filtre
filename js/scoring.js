import { TYPES } from './data.js';

export const CONFIG = {
  poids: { joueurs: 1, duree: 1, age: 1.5, type: 1.5, complexite: 1 },
  joueursNonIdeal: 0.6,
  penaliteAgeParAnnee: 0.15,
  penaliteComplexiteParPoint: 0.25,
  typeSemiCoop: 0.6,
  typeIncompatible: 0.2,
  intervallesComplexite: {
    leger: { min: 1, max: 2.5, libelle: 'léger' },
    moyen: { min: 2.5, max: 3.5, libelle: 'moyen' },
    costaud: { min: 3.5, max: 5, libelle: 'costaud' },
  },
};

const plancher = (valeur) => Math.max(0, valeur);

const enumeration = new Intl.ListFormat('fr', { type: 'disjunction' });

export function jouableA(jeu, joueurs) {
  return jeu.joueursMin <= joueurs && joueurs <= jeu.joueursMax;
}

function noteJoueurs(jeu, joueurs) {
  if (!jeu.joueursIdeal.length) return { valeur: 1 };
  if (jeu.joueursIdeal.includes(joueurs)) return { valeur: 1 };
  return {
    valeur: CONFIG.joueursNonIdeal,
    penalite: `meilleur à ${enumeration.format(jeu.joueursIdeal.map(String))} joueurs`,
  };
}

function noteDuree(jeu, budget) {
  if (jeu.dureeMax <= budget) return { valeur: 1 };
  return {
    valeur: plancher(1 - (jeu.dureeMax - budget) / budget),
    penalite: `jusqu'à ${jeu.dureeMax} min pour ${budget} min disponibles`,
  };
}

function noteAge(jeu, age) {
  if (jeu.ageMin <= age) return { valeur: 1 };
  const ecart = jeu.ageMin - age;
  return {
    valeur: plancher(1 - CONFIG.penaliteAgeParAnnee * ecart),
    penalite: `${jeu.ageMin}+ pour un joueur de ${age} ans`,
  };
}

function noteType(jeu, typeVoulu) {
  if (jeu.type === typeVoulu) return { valeur: 1 };
  if (jeu.type === 'semi-coop') {
    return { valeur: CONFIG.typeSemiCoop, penalite: 'semi-coopératif seulement' };
  }
  return {
    valeur: CONFIG.typeIncompatible,
    penalite: `${TYPES[jeu.type].toLowerCase()} alors que vous vouliez du ${TYPES[typeVoulu].toLowerCase()}`,
  };
}

function noteComplexite(jeu, cle) {
  const { min, max, libelle } = CONFIG.intervallesComplexite[cle];
  if (jeu.complexite >= min && jeu.complexite <= max) return { valeur: 1 };
  const ecart = jeu.complexite < min ? min - jeu.complexite : jeu.complexite - max;
  return {
    valeur: plancher(1 - CONFIG.penaliteComplexiteParPoint * ecart),
    penalite: `complexité ${jeu.complexite.toFixed(1)} pour une envie de jeu ${libelle}`,
  };
}

// Un critère à `null` (« peu importe ») sort du calcul : le compter comme neutre diluerait les autres.
export function classer(jeux, reponses) {
  const criteres = [
    ['joueurs', reponses.joueurs, (jeu) => noteJoueurs(jeu, reponses.joueurs)],
    ['duree', reponses.duree, (jeu) => noteDuree(jeu, reponses.duree)],
    ['age', reponses.age, (jeu) => noteAge(jeu, reponses.age)],
    ['type', reponses.type, (jeu) => noteType(jeu, reponses.type)],
    ['complexite', reponses.complexite, (jeu) => noteComplexite(jeu, reponses.complexite)],
  ].filter(([, reponse]) => reponse !== null && reponse !== undefined);

  const total = criteres.reduce((somme, [nom]) => somme + CONFIG.poids[nom], 0);

  return jeux
    .filter((jeu) => jouableA(jeu, reponses.joueurs))
    .map((jeu) => {
      const penalites = [];
      let cumul = 0;
      for (const [nom, , noter] of criteres) {
        const { valeur, penalite } = noter(jeu);
        cumul += CONFIG.poids[nom] * valeur;
        if (penalite) penalites.push(penalite);
      }
      return { jeu, score: Math.round((cumul / total) * 100), penalites };
    })
    .sort((a, b) => b.score - a.score || a.jeu.nom.localeCompare(b.jeu.nom, 'fr'));
}
