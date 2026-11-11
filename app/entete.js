// En-tête commun aux 4 onglets : marque du syndicat, sauvegarde, affichage rapide, réglages.
import { S, joursDepuisSauvegarde, appliquerAffichage, sauver } from './etat.js';
import { esc, ic, marque } from './commun.js';

export function barreHaut() {
  const js = joursDepuisSauvegarde();
  const ok = js !== null && js < 31;
  return `<header class="haut"><div class="marque">${marque(S.cfg)}<span>${esc(S.cfg.syndicat)}</span></div><div class="icones">
    <a class="btn-icone" href="#/sauvegarde" data-tour="sauvegarde" aria-label="${ok ? 'Sauvegarde à jour' : 'Sauvegarde à faire'}" title="Sauvegarde" style="color:${ok ? 'var(--vert)' : 'var(--ambre)'}">${ic(ok ? 'bouclier' : 'bouclierAlerte')}</a>
    <a class="btn-icone" href="#/contact" aria-label="Contacter le syndicat" title="Contacter le syndicat">${ic('telephone')}</a>
    <button type="button" class="btn-icone aa" data-affichage aria-label="Affichage : thème et taille du texte" title="Affichage">Aa</button>
    <a class="btn-icone" href="#/reglages" data-tour="reglages" aria-label="Réglages" title="Réglages">${ic('engrenage')}</a></div></header>`;
}

// Petit panneau « Affichage », ouvert depuis le bouton Aa.
export function panneauAffichage() {
  if (!S.vue.affichage) return '';
  const R = S.etat.reglages;
  const seg = (cle, valeurs) => `<div class="segment" role="group" aria-label="${cle === 'theme' ? 'Thème' : 'Taille du texte'}">${valeurs.map(([v, l, a]) => `<button type="button" data-${cle}-rapide="${v}" aria-pressed="${String(R[cle] ?? 0) === String(v)}" ${a ? `aria-label="${a}"` : ''}>${l}</button>`).join('')}</div>`;
  return `<div class="voile-panneau" data-fermer-affichage></div><section class="panneau-bas" role="dialog" aria-label="Affichage">
    <div class="poignee" aria-hidden="true"></div>
    <div style="display:flex;justify-content:space-between;align-items:center"><h2 style="font-size:1.125rem">Affichage</h2><button type="button" class="btn-icone" data-fermer-affichage aria-label="Fermer">${ic('fermer')}</button></div>
    <p class="etiquette">Thème</p>${seg('theme', [['clair', 'Clair'], ['sombre', 'Sombre'], ['auto', 'Auto']])}
    <p class="etiquette">Taille du texte</p>${seg('taille', [[0, '<span style="font-size:.875rem">A</span>', 'Normale'], [1, '<span style="font-size:1.0625rem">A</span>', 'Grande'], [2, '<span style="font-size:1.25rem">A</span>', 'Très grande']])}
    <a class="btn plein" href="#/reglages" data-fermer-affichage>${ic('engrenage')}Tous les réglages</a>
  </section>`;
}

export function brancherAffichage(racine) {
  racine.querySelectorAll('[data-affichage]').forEach((b) => b.onclick = () => { S.vue.affichage = true; S.rendre(); });
  racine.querySelectorAll('[data-fermer-affichage]').forEach((b) => b.addEventListener('click', () => { S.vue.affichage = false; if (b.tagName !== 'A') S.rendre(); }));
  racine.querySelectorAll('[data-theme-rapide]').forEach((b) => b.onclick = () => { S.etat.reglages.theme = b.dataset.themeRapide; appliquerAffichage(); sauver(); S.rendre(); });
  racine.querySelectorAll('[data-taille-rapide]').forEach((b) => b.onclick = () => { S.etat.reglages.taille = Number(b.dataset.tailleRapide); appliquerAffichage(); sauver(); S.rendre(); });
}
