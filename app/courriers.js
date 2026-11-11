// Mon Temps — modèles de courriers et signalements confidentiels.
import { S } from './etat.js';
import { esc, ic, toast, enteteRetour, mailto } from './commun.js';

const profil = () => S.etat.profil || {};
const signature = () => { const p = profil(); return [p.nomComplet || p.prenom, p.metier, p.service].filter(Boolean).join('\n') || '[Nom, prénom, grade, service]'; };
const ou = (v, defaut) => (v && String(v).trim()) || defaut;

// Les modèles viennent de config/courriers.json (modifiables dans Pages CMS).
// Dans un texte : {dates} {heures} {periode} {delai} {quotite} {jours} {precisions} {service} sont remplacés par ce que
// l'agent a saisi (ou par un crochet à compléter). [[ bloc {x} ]] disparaît si {x} est vide ; [[ A | B ]] affiche B si {x} de A est vide.
const MODELES = () => Object.fromEntries((S.cfg.courriers.modeles || []).map((m) => [m.id, m]));
const ATTENDU = { dates: '[date]', heures: '[nombre d\'heures]', periode: '[période]', delai: '[délai]', quotite: '[quotité] %', jours: '[nombre]', precisions: '[à préciser]', service: '[service]' };
function remplirModele(texte, v) {
  const val = (k) => String(k === 'service' ? profil().service || '' : v[k] || '').trim();
  const sections = texte.replace(/\[\[([\s\S]*?)\]\]/g, (_, bloc) => {
    const [a, b] = bloc.split('|');
    const jetons = (a.match(/\{(\w+)\}/g) || []).map((x) => x.slice(1, -1));
    return jetons.every((k) => val(k)) ? a : (b !== undefined ? b : '');
  });
  return sections.replace(/\{(\w+)\}/g, (_, k) => val(k) || ATTENDU[k] || `[${k}]`);
}
const LIBELLES = { dates: ['Date(s) concernée(s)', 'Ex. : 12 novembre 2026'], heures: ['Nombre d\'heures', 'Ex. : 7h30'], periode: ['Période', 'Ex. : l\'année 2026'], delai: ['Prévenu·e combien de temps avant ?', 'Ex. : la veille au soir'], quotite: ['Quotité souhaitée', 'Ex. : 80 %'], jours: ['Nombre de jours', 'Ex. : 3'], precisions: ['Précisions', ''] };

export function vueCourriers() {
  const K = S.vue.courrier || (S.vue.courrier = { modele: 'releve', v: {}, texte: null });
  const MOD = MODELES();
  if (!MOD[K.modele]) K.modele = Object.keys(MOD)[0];
  const m = MOD[K.modele];
  if (!m) return { html: `${enteteRetour('Courriers', '#/outils')}<div class="page"><p class="vide-etat">Aucun modèle de courrier n'est disponible.</p></div>` };
  const texte = K.texte != null ? K.texte : `${remplirModele(m.texte, K.v)}\n\n${S.cfg.courriers.formule || 'Cordialement,'}\n${signature()}`;
  const groupes = [...new Set(Object.values(MOD).map((x) => x.groupe))];
  return {
    html: `${enteteRetour('Courriers', '#/outils')}
      <div class="page" style="margin-top:.75rem">
        <label class="champ"><span>Modèle</span><select id="modele">${groupes.map((g) => `<optgroup label="${esc(g)}">${Object.entries(MOD).filter(([, x]) => x.groupe === g).map(([k, x]) => `<option value="${k}" ${K.modele === k ? 'selected' : ''}>${esc(x.titre)}</option>`).join('')}</optgroup>`).join('')}</select></label>
        ${(m.champs || []).map((c) => c === 'precisions' ? `<label class="champ"><span>${(LIBELLES[c] || [c, ''])[0]}</span><textarea data-c="${c}" style="min-height:4.5rem">${esc(K.v[c] || '')}</textarea></label>` : `<label class="champ"><span>${(LIBELLES[c] || [c, ''])[0]}</span><input data-c="${c}" value="${esc(K.v[c] || '')}" placeholder="${esc((LIBELLES[c] || [c, ""])[1])}"></label>`).join('')}
        <label class="champ"><span>Courrier (tu peux le modifier)</span><textarea id="texte" style="min-height:16rem">${esc(texte)}</textarea></label>
        <div class="rangee"><button class="btn" id="copier">Copier</button><a class="btn principal" id="mail" href="#">${ic('mail')}Par mail</a></div>
        <p class="petit" style="margin:0">Garde toujours une copie de ce que tu envoies. Un doute sur la formulation ? Montre-le au syndicat avant.</p>
      </div>`,
    apres(el) {
      el.querySelector('#modele').onchange = (e) => { K.modele = e.target.value; K.texte = null; S.rendre(); };
      el.querySelectorAll('[data-c]').forEach((i) => { i.onchange = () => { K.v[i.dataset.c] = i.value; K.texte = null; S.rendre(); }; });
      const t = el.querySelector('#texte'); t.oninput = () => { K.texte = t.value; };
      el.querySelector('#copier').onclick = async () => { try { await navigator.clipboard.writeText(t.value); toast('Courrier copié'); } catch (e) { t.select(); toast('Sélectionné : copie-le avec ton clavier'); } };
      el.querySelector('#mail').onclick = () => { el.querySelector('#mail').href = mailto('', m.titre, t.value); };
    }
  };
}

// ---------- Signalements ----------
const SIGNALEMENTS = {
  violence: { titre: 'Violence', intro: 'Tu n\'as pas à rester seul·e.', legende: 'Violence', objet: 'une situation de violence', choix: ['De la hiérarchie', 'De collègue(s)', 'De patient(s) ou de proches', 'Autre'], aide: 'Dates, lieu, témoins éventuels.' },
  discrimination: { titre: 'Discrimination', intro: 'Tu n\'as pas à rester seul·e.', legende: 'Motif', objet: 'une discrimination', choix: ['Origine', 'Sexe ou genre', 'Âge', 'Handicap ou santé', 'Grossesse', 'Activité syndicale', 'Convictions', 'Orientation sexuelle', 'Autre'], aide: 'Dates, lieu, témoins éventuels.' },
  exposition: { titre: 'Exposition', intro: 'Une exposition à un produit ou à un agent dangereux doit laisser une trace écrite : elle peut compter des années plus tard.', legende: 'Exposition à', objet: 'une exposition à un risque', choix: ['Amiante', 'Produit chimique ou médicament dangereux', 'Fumées ou gaz', 'Sang ou liquide biologique', 'Agent infectieux', 'Rayonnements', 'Bruit, chaleur', 'Autre'], aide: 'Date, lieu, durée, produit en cause, protections disponibles ou non, personnes exposées.' }
};
export function vueSignalement(p) {
  const s = SIGNALEMENTS[p[1]] || SIGNALEMENTS.violence; const pr = profil();
  const indispo = !S.cfg.contacts || !S.cfg.contacts.mailSignalement;
  return {
    html: `${enteteRetour(s.titre, '#/syndicat')}
      <div class="page" style="margin-top:.75rem">
        <p class="texte">${esc(s.intro)} Ce message part de ta messagerie vers les délégué·es, qui te proposeront un rendez-vous en toute confidentialité.</p>
        <fieldset class="liste" style="padding:.25rem 0;margin:0"><legend class="etiquette" style="padding:0 .875rem">${esc(s.legende)}</legend>
          ${s.choix.map((t) => `<label class="ligne" style="cursor:pointer"><span>${esc(t)}</span><input type="checkbox" value="${esc(t)}" data-t style="width:1.375rem;height:1.375rem;accent-color:var(--rouge)"></label>`).join('')}</fieldset>
        <label class="champ"><span>Ce qui s'est passé, en quelques mots</span><textarea id="faits" placeholder="${esc(s.aide)} N'indique aucune information sur l'identité ou la santé d'un patient."></textarea></label>
        <label class="champ"><span>Comment te joindre ?</span><input id="joindre" placeholder="Téléphone ou créneaux (facultatif)"></label>
        <div class="rangee"><label class="champ"><span>Nom et prénom</span><input id="nom" value="${esc(pr.nomComplet || pr.prenom || '')}" autocomplete="name"></label></div>
        <div class="rangee"><label class="champ"><span>Métier</span><input id="metier" value="${esc(pr.metier || '')}"></label><label class="champ"><span>Service</span><input id="service" value="${esc(pr.service || '')}"></label></div>
        <a class="btn principal plein" id="envoyer" href="#" ${indispo ? 'aria-disabled="true" style="opacity:.5"' : ''}>${ic('mail')}Préparer le message</a>
        ${indispo ? '<p class="petit" style="margin:0">L\'adresse des délégué·es n\'est pas encore renseignée dans l\'appli.</p>' : ''}
        ${p[1] === 'exposition' ? '<p class="petit" style="margin:0">Pense aussi à faire inscrire l\'exposition dans ton dossier médical par le service de santé au travail, et à déclarer un accident de service s\'il y a eu un incident.</p>' : ''}
      </div>`,
    apres(el) {
      el.querySelector('#envoyer').onclick = (e) => {
        if (indispo) { e.preventDefault(); return; }
        const v = (id) => el.querySelector('#' + id).value.trim();
        const choix = [...el.querySelectorAll('[data-t]:checked')].map((i) => i.value);
        const corps = `Bonjour,\n\nJe souhaite signaler ${s.objet} et rencontrer un·e délégué·e.\n\n${s.legende} : ${choix.join(', ') || 'non précisé'}\n\nFaits :\n${v('faits') || '(à préciser de vive voix)'}\n\nMe joindre : ${v('joindre') || 'par retour de mail'}\n\n${[v('nom'), v('metier'), v('service')].filter(Boolean).join('\n')}\n`;
        el.querySelector('#envoyer').href = mailto(S.cfg.contacts.mailSignalement, 'Signalement confidentiel — demande de rendez-vous', corps);
      };
    }
  };
}
