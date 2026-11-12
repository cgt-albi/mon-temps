// Les réglages sont rangés dans plusieurs petits fichiers (un par rubrique de Pages CMS),
// puis réassemblés à la publication en contenu.json et regles.json, lus par l'appli.
import fs from 'node:fs';
import path from 'node:path';

export const PARTIES_CONTENU = ['appli.json', 'contacts.json', 'actualites.json', 'elections.json', 'paie.json', 'droits.json'];

export function fusionner(racine) {
  const lire = (f) => JSON.parse(fs.readFileSync(path.join(racine, 'config', f), 'utf8'));
  const contenu = Object.assign({}, ...PARTIES_CONTENU.map(lire));
  const { aValider, ...regles } = lire('regles.json');
  Object.assign(regles, lire('regimes.json'));
  return { contenu, regles: { ...regles, aValider } };
}
