// Mon Temps — mode essai (faux planning) et visite guidée interactive.
import * as M from './moteur.js';
import * as St from './stockage.js';
import { S, aller } from './etat.js';
import { esc } from './commun.js';

let etape = -1;
let calque = null;

function etatDemo() {
  const e = St.etatVide();
  e.profil = { prenom: 'Camille', metier: 'IDE', quotite: 100, service: 'Médecine' };
  e.derniereSauvegarde = new Date(Date.now() - 9 * 864e5).toISOString();
  const today = M.aujourdhui();
  const debut = M.ajouterJours(today.slice(0, 7) + '-01', -35);
  const fin = M.ajouterJours(today, 40);
  const travail = ['M41', 'M52', 'J38', 'M41', 'J38'];
  let k = 0;
  for (let n = M.jourNum(debut); n <= M.jourNum(fin); n++) {
    const d = M.depuisNum(n); const js = M.jourSemaine(d);
    let code;
    if (M.nomFerie(d) && !M.estPentecote(d)) code = 'RF';
    else if (js === 5 || js === 6) code = (n % 3 === 0 && js === 5) ? 'M52' : 'RH';
    else if (n % 11 === 0) code = 'RTT';
    else code = travail[k++ % travail.length];
    e.jours[d] = { prevu: { code } };
  }
  // quelques journées réellement différentes, pour l'exemple
  const passe = (x) => M.ajouterJours(today, -x);
  const marque = (d, r) => { if (d < today && e.jours[d]) e.jours[d].realise = r; };
  marque(passe(3), { code: e.jours[passe(3)].prevu.code, depassementMin: 35, note: 'Sortie tardive, transmissions' });
  marque(passe(8), { code: 'J38', depassementMin: 20 });
  const rap = passe(13);
  e.jours[rap] = { prevu: { code: 'RH' }, realise: { code: 'M52', note: 'Remplacement d\'une collègue' } };
  e.preuves.push({ id: 'rappel-' + rap, type: 'rappel', date: rap, code: 'M52', appelLe: `${M.ajouterJours(rap, -1)}T19:10`, compense: false, creeLe: new Date().toISOString() });
  delete e.jours[today].realise;
  if (!e.jours[today].prevu || ['RH', 'RF', 'RTT'].includes(e.jours[today].prevu.code)) e.jours[today] = { prevu: { code: 'M52' } };
  return e;
}

const ETAPES = [
  { route: /^planning/, cible: 'grille', titre: 'Ton mois en un coup d\'œil', texte: 'Chaque case porte le code du planning de l\'hôpital. Case pleine : la journée est faite. Pointillés : elle est encore prévue.' },
  { route: /^planning/, cible: () => 'jour-' + M.aujourdhui(), titre: 'Noter ta journée', texte: 'Touche la case d\'aujourd\'hui, encadrée en rouge.', attendre: /^jour/ },
  { route: /^jour/, cible: 'codes', titre: 'Ce que tu as vraiment fait', texte: 'Le prévu est déjà connu. Si la journée a changé, choisis le bon code. Sinon, laisse tel quel.', suivantPossible: true, evenement: 'code' },
  { route: /^jour/, cible: 'depassement', titre: 'Partie plus tard ?', texte: 'Touche « + » pour ajouter les minutes en plus. Même un quart d\'heure compte.', evenement: 'depassement', suivantPossible: true, siAbsent: 'passer' },
  { route: /^jour/, cible: 'enregistrer', titre: 'Et voilà', texte: 'Touche « Enregistrer la journée ». C\'est tout, chaque jour : quelques secondes.', attendre: /^planning/ },
  { route: /^planning/, cible: 'remplir', titre: 'Recopier le planning du mois', texte: 'Quand le planning du mois sort, ce bouton te permet de le recopier en quelques gestes : un code, puis tous les jours concernés.' },
  { route: /^planning/, cible: 'nav-compteurs', titre: 'Tes compteurs', texte: 'Touche « Compteurs » en bas de l\'écran.', attendre: /^compteurs/ },
  { route: /^compteurs/, cible: 'solde', titre: 'Ton solde d\'heures', texte: 'Ce que tu as fait, moins ce que tu dois. Une barre par mois : au-dessus, des heures en plus ; en dessous, des heures en moins.' },
  { route: /^compteurs/, cible: 'alertes', titre: 'Tes droits, vérifiés', texte: 'L\'appli contrôle les repos et les durées prévus par le décret. Une ligne rouge : une règle n\'a pas été respectée. Un point rouge apparaît aussi sur le jour, dans le planning.' },
  { route: /^compteurs/, cible: 'nav-preuves', titre: 'Mes preuves', texte: 'Touche « Mes preuves ».', attendre: /^preuves/ },
  { route: /^preuves/, cible: 'onglets-preuves', titre: 'Garder une trace', texte: 'Rappels sur repos, changements de dernière minute, dépassements : tout est daté. Tu peux tout envoyer au syndicat d\'un geste.' },
  { route: /^preuves/, cible: 'nav-planning', titre: 'Retour au planning', texte: 'Touche « Planning ».', attendre: /^planning/ },
  { route: /^planning/, cible: 'sauvegarde', titre: 'Le bouclier : ta sauvegarde', texte: 'Tes données ne sont que sur ce téléphone. Vert : la sauvegarde est récente. Orange : pense à en refaire une. Une fois par mois suffit.' },
  { route: /^planning/, cible: 'reglages', titre: 'Tes réglages', texte: 'Le bouton « Aa » change tout de suite le thème (clair ou sombre) et la taille du texte. L\'engrenage ouvre tous les réglages : ton poste, tes horaires, l\'affichage.' },
  { route: null, cible: null, titre: 'C\'est parti', texte: 'Fin de la visite. On quitte le mode essai : ton vrai planning, vide, t\'attend. Commence par « Remplir plusieurs jours d\'un coup ».', fin: true }
];

export function demarrerEssai() {
  if (!S.demo) S.etatReel = S.etat;
  S.etat = etatDemo(); S.demo = true; S.vue = {}; etape = 0;
  aller('#/planning');
}

export function quitterEssai() {
  fermerCalque(); etape = -1;
  if (S.demo) { S.etat = S.etatReel || St.etatVide(); S.etatReel = null; S.demo = false; }
  S.vue = {};
  aller('#/planning');
}

const routeCourante = () => (location.hash.replace(/^#\/?/, '') || 'planning');

export function apresRendu() {
  if (etape < 0) return;
  const r = routeCourante();
  const e = ETAPES[etape];
  if (e && e.attendre && e.attendre.test(r)) { etape++; }
  afficher();
}

['code', 'depassement'].forEach((nom) => window.addEventListener('mt:' + nom, () => {
  if (etape < 0) return;
  const e = ETAPES[etape];
  if (e && e.evenement === nom) { etape++; setTimeout(afficher, 50); }
}));
window.addEventListener('resize', () => { if (etape >= 0) positionner(); });
window.addEventListener('scroll', () => { if (etape >= 0) positionner(); }, { passive: true });

function fermerCalque() { if (calque) { calque.remove(); calque = null; } }

function afficher() {
  fermerCalque();
  if (etape < 0 || etape >= ETAPES.length) return;
  const e = ETAPES[etape];
  const r = routeCourante();
  if (e.route && !e.route.test(r)) return; // l'utilisateur est ailleurs : on attend qu'il revienne
  const id = typeof e.cible === 'function' ? e.cible() : e.cible;
  const el = id ? document.querySelector(`[data-tour="${id}"]`) : null;
  if (id && !el) { if (e.siAbsent === 'passer') { etape++; afficher(); } return; }
  calque = document.createElement('div');
  calque.setAttribute('role', 'dialog'); calque.setAttribute('aria-label', 'Visite guidée');
  const action = e.attendre || (e.evenement && !e.suivantPossible);
  calque.innerHTML = `<div class="visite-voile" data-v="h"></div><div class="visite-voile" data-v="b"></div><div class="visite-voile" data-v="g"></div><div class="visite-voile" data-v="d"></div><div class="visite-trou"></div>
    <div class="visite-bulle" aria-live="polite"><div class="etape">Visite · ${etape + 1} / ${ETAPES.length}</div><h2>${esc(e.titre)}</h2><p>${esc(e.texte)}</p>
      <div class="actions">${e.fin ? '<span></span>' : '<button type="button" class="btn petit-btn" data-x="stop" style="border:0;background:none;color:var(--sourdine)">Arrêter la visite</button>'}
      ${e.fin ? '<button type="button" class="btn principal petit-btn" data-x="fin">Terminer</button>' : action ? '<span class="faire"><i></i>À toi</span>' : '<button type="button" class="btn principal petit-btn" data-x="suivant">Suivant</button>'}</div></div>`;
  document.body.appendChild(calque);
  calque.querySelectorAll('[data-x]').forEach((b) => b.onclick = () => {
    const x = b.dataset.x;
    if (x === 'suivant') { etape++; afficher(); }
    else quitterEssai();
  });
  if (el) {
    const rect = el.getBoundingClientRect();
    if (rect.top < 80 || rect.bottom > innerHeight - 200) el.scrollIntoView({ block: 'center' });
  }
  positionner();
  const btn = calque.querySelector('.visite-bulle button[data-x="suivant"],.visite-bulle button[data-x="fin"]');
  if (btn) btn.focus({ preventScroll: true });
}

function positionner() {
  if (!calque) return;
  const e = ETAPES[etape]; if (!e) return;
  const id = typeof e.cible === 'function' ? e.cible() : e.cible;
  const el = id ? document.querySelector(`[data-tour="${id}"]`) : null;
  const bulle = calque.querySelector('.visite-bulle');
  const v = (k) => calque.querySelector(`[data-v="${k}"]`);
  const trou = calque.querySelector('.visite-trou');
  if (!el) {
    v('h').style.cssText = 'inset:0'; ['b', 'g', 'd'].forEach((k) => { v(k).style.cssText = 'display:none'; }); trou.style.display = 'none';
    bulle.style.top = '30%'; bulle.style.bottom = 'auto'; return;
  }
  const r = el.getBoundingClientRect(); const m = 6;
  const t = Math.max(0, r.top - m), b = Math.min(innerHeight, r.bottom + m), g = Math.max(0, r.left - m), d = Math.min(innerWidth, r.right + m);
  v('h').style.cssText = `left:0;right:0;top:0;height:${t}px`;
  v('b').style.cssText = `left:0;right:0;top:${b}px;bottom:0`;
  v('g').style.cssText = `left:0;top:${t}px;width:${g}px;height:${b - t}px`;
  v('d').style.cssText = `left:${d}px;right:0;top:${t}px;height:${b - t}px`;
  trou.style.cssText = `display:block;left:${g}px;top:${t}px;width:${d - g}px;height:${b - t}px`;
  const enBas = (r.top + r.bottom) / 2 < innerHeight / 2;
  if (enBas) { bulle.style.top = `${Math.min(b + 12, innerHeight - 200)}px`; bulle.style.bottom = 'auto'; }
  else { bulle.style.bottom = `${Math.min(innerHeight - t + 12, innerHeight - 200)}px`; bulle.style.top = 'auto'; }
}
