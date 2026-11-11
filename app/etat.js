// État partagé de l'appli.
import * as M from './moteur.js';
import * as St from './stockage.js';

export const S = { cfg: null, etat: null, demo: false, etatReel: null, vue: {}, rendre: () => {} };

export const codes = () => M.tousLesCodes(S.cfg, S.etat);

let minuteur = null;
export function sauver() {
  if (S.demo) return;
  clearTimeout(minuteur);
  minuteur = setTimeout(() => St.enregistrer(S.etat), 120);
}

export function aller(hash) {
  if (location.hash === hash) S.rendre(); else location.hash = hash;
}

export function appliquerAffichage() {
  const r = S.etat.reglages || {};
  const sombre = r.theme === 'sombre' || (r.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = sombre ? 'sombre' : 'clair';
  document.documentElement.dataset.taille = String(r.taille || 0);
}

export function quotiteTexte() { const q = S.etat.profil && S.etat.profil.quotite; return (q || S.cfg.regles.quotiteParDefaut) + ' %'; }

export function joursDepuisSauvegarde() {
  const d = S.etat.derniereSauvegarde;
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d).getTime()) / 864e5);
}
