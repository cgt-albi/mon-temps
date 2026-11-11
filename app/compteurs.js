// Mon Temps — compteurs de l'année, avec une explication derrière chaque « ? ».
import * as M from './moteur.js';
import { S, sauver, aller } from './etat.js';
import { esc, ic, toast, enteteRetour, badgeProvisoire } from './commun.js';
import { barreHaut } from './entete.js';

const euros = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
const pl = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

// Explications affichées par les boutons « ? » (rédigées pour l'appli, à partir des textes officiels).
const INFOS = (R) => ({
  solde: { titre: 'Solde et théorique', p: [
    'Ton solde, c\'est ce que tu as fait moins ce que tu devais faire, depuis le début de ton suivi.',
    `Ce que tu dois (le « théorique ») : ${R.valeurJourneeHeures} h par jour du lundi au vendredi, ajusté à ta quotité. Les jours fériés et tes congés annuels sont retirés du compte.`,
    'Ce que tu as fait : la durée de tes journées de travail, pause déduite, plus tes dépassements. Maladie, formation et garde d\'enfant comptent comme la journée prévue.',
    'Un solde négatif n\'est pas une dette : c\'est le planning qui ne t\'a pas donné assez d\'heures. Un solde positif, ce sont des heures à récupérer ou à payer.',
    'Chaque barre du graphique est le solde d\'un mois : vers le haut, des heures en plus ; vers le bas, en rouge, des heures en moins.'] },
  garanties: { titre: 'Garanties minimales', p: [
    'Le décret du 4 janvier 2002 fixe des limites que tout planning doit respecter. L\'appli les vérifie sur tes saisies.',
    `Repos entre deux journées : ${R.reposQuotidienMinHeures} h d'affilée au minimum.`,
    `Repos de la semaine : ${R.reposHebdoMinHeures} h d'affilée au minimum.`,
    `Sur 7 jours qui se suivent : ${R.maxSeptJoursHeures} h de travail au maximum, heures supplémentaires comprises.`,
    `Sur deux semaines : ${R.reposQuinzaineMinJours} jours de repos, dont 2 qui se suivent, dont un dimanche.`,
    `Une journée ne peut pas s'étendre sur plus de ${R.amplitudeMaxHeures} h (10 h 30 si elle est coupée en deux).`,
    'Un jour non saisi n\'est jamais compté comme une faute. Une alerte se discute toujours avec ton cadre ; si elle se répète, viens voir le syndicat.'] },
  conges: { titre: 'Congés annuels', p: [
    `${R.caParAn} jours ouvrés par an à temps plein, au prorata si tu es à temps partiel.`,
    'Jours « hors saison » : si tu prends 3, 4 ou 5 jours de congé entre le 1er novembre et le 30 avril, tu gagnes 1 jour ; à partir de 6 jours, tu en gagnes 2.',
    'Jour de fractionnement : 1 jour en plus si tes congés sont pris en au moins 3 périodes d\'au moins 5 jours ouvrés chacune.',
    'L\'appli ajoute ces jours gagnés à ton droit dès que la condition est remplie par ton planning, prévu compris.'] },
  rtt: { titre: 'RTT', p: [
    'Les jours de RTT compensent une durée de travail supérieure à 35 h par semaine. Leur nombre dépend de ton cycle de travail et de ta quotité.',
    `L'appli compte pour l'instant ${R.rttParAn} jours par an à temps plein. Ce chiffre sera calé sur le protocole de l'établissement.`,
    'Certaines absences (maladie notamment) réduisent le nombre de RTT acquis : compare avec ton compteur officiel.'] },
  cet: { titre: 'Compte épargne-temps', p: [
    'Le CET permet de mettre de côté des jours non pris (congés annuels au-delà de 20 jours pris, RTT, heures supplémentaires non récupérées) pour les utiliser plus tard.',
    'L\'ouverture d\'un CET est un droit, jamais une obligation : personne ne peut t\'imposer d\'y verser des jours.',
    'Note ici chaque versement. Quand tu poses un jour avec le code CET dans ton planning, l\'appli le retire du solde.',
    'Chaque année, l\'établissement doit t\'informer du nombre de jours inscrits sur ton compte : vérifie qu\'il correspond.'] },
  hs: { titre: 'Heures sup et récup', p: [
    'Chaque minute au-delà de ton horaire prévu est un dépassement. Note-les toutes, même un quart d\'heure.',
    'Ces heures sont soit récupérées (jours posés avec le code REC), soit payées.',
    'Le « reste » affiché, ce sont tes dépassements moins ce que tu as déjà récupéré. S\'il grossit, demande par écrit à récupérer ou à être payé·e : un modèle de courrier est prêt dans Outils.'] },
  djf: { titre: 'Dimanches et jours fériés', p: [
    'L\'appli compte les heures réellement travaillées un dimanche ou un jour férié. Une nuit à cheval sur deux jours ne compte que pour les heures tombant ce jour-là.',
    `Ces heures donnent droit à une indemnité forfaitaire : ${R.indemniteDimancheFerie8h} € pour 8 h, au prorata du temps travaillé.`,
    'Le montant estimé t\'aide à vérifier ta fiche de paie. L\'indemnité est en général versée avec un ou deux mois de décalage.'] },
  nuit: { titre: 'Nuits travaillées', p: [
    `Sont comptées les heures faites entre ${R.nuitDebut.replace(':', ' h ')} et ${R.nuitFin.replace(':', ' h ')}. Une « nuit » est une journée qui en comporte au moins une heure.`,
    `Depuis 2024, chaque heure de nuit est majorée de ${R.majorationNuitPct} % de ton taux horaire. Renseigne ton indice dans Outils › Salaire pour voir le montant attendu.`,
    'Le travail de nuit régulier ouvre aussi des droits particuliers (durée du travail réduite, suivi médical) : parles-en au syndicat.'] },
  rh: { titre: 'Repos hebdomadaires', p: [
    'Les RH sont tes jours de repos de la semaine. Sur une année pleine, on en attend environ 104 (deux par semaine).',
    'L\'appli compte les RH posés depuis le début de ton suivi. Un RH travaillé (rappel) doit être rendu : note-le dans « Mes preuves ».'] },
  ge: { titre: 'Garde d\'enfant', p: [
    'Des autorisations d\'absence peuvent être accordées pour soigner un enfant malade ou en assurer la garde, jusqu\'à ses 16 ans (sans limite d\'âge si l\'enfant est en situation de handicap).',
    `Repère habituel dans la fonction publique : ${R.gardeEnfantJours} jours par an à temps plein, par famille. Ce nombre est doublé si tu élèves seul·e ton enfant ou si ton conjoint n'a pas ce droit.`,
    'Ces jours sont accordés sous réserve des nécessités de service, sur justificatif. Pose-les avec le code GE : ils sont comptés comme une journée normale.'] }
});

export function vueCompteurs(p) {
  const y = /^\d{4}$/.test(p[1] || '') ? Number(p[1]) : Number(M.aujourdhui().slice(0, 4));
  const R = S.cfg.regles; const b = M.bilanAnnee(y, S.etat, S.cfg);
  const today = M.aujourdhui(); const enCours = String(y) === today.slice(0, 4);
  const finCtrl = enCours ? M.ajouterJours(today, 60) : `${y}-12-31`;
  const alertes = S.etat.reglages.controles ? M.controles(`${y}-01-01`, finCtrl < `${y}-12-31` ? finCtrl : `${y}-12-31`, S.etat, S.cfg) : [];
  const soldes = b.mois.map((x) => (x ? x.solde : 0));
  const max = Math.max(60, ...soldes.map(Math.abs));
  const barres = soldes.map((s) => `<div><div class="h">${s > 0 ? `<i style="height:${Math.round(s / max * 100)}%"></i>` : ''}</div><div class="axe"></div><div class="b">${s < 0 ? `<i style="height:${Math.round(-s / max * 100)}%"></i>` : ''}</div></div>`).join('');
  const caDroit = b.caDroit + b.bonusHS + b.bonusFrac, caReste = caDroit - b.caPris, rttReste = b.rttDroit - b.rttPris;
  const pct = (a, t) => Math.max(0, Math.min(100, t ? Math.round(a / t * 100) : 0));
  const cet = M.soldeCet(S.etat, S.cfg);
  const resteHS = b.depassements - b.recupMin;
  const im = Number(S.etat.profil && S.etat.profil.indiceMajore) || 0;
  const tauxH = im ? im * R.valeurPointMensuel * 12 / R.heuresAnnuellesTauxHoraire : 0;
  const q = (cle) => `<button type="button" class="aide" data-info="${cle}" aria-label="Explication">?</button>`;
  const tuile = (cle, l, v, u, sous, j, teinte, lien) => `<div class="tuile t-${cle}"><div class="l"><span>${l}</span>${q(cle)}</div><div class="v">${v}<small>${u}</small></div>${j === null ? '' : `<div class="jauge"><i style="width:${j}%;background:${teinte}"></i></div>`}<div class="petit" style="margin-top:.375rem">${sous}</div>${lien || ''}</div>`;
  const regles = ['Repos quotidien', 'Repos hebdomadaire', '48 heures sur 7 jours', 'Repos de la quinzaine', 'Amplitude de la journée'];
  const vues = new Set(alertes.map((a) => a.regle));
  const listeAlertes = alertes.slice().reverse().slice(0, S.vue.toutesAlertes ? 999 : 3).map((a) => `<li class="alerte grave">${ic('alerte')}<div><div class="t">${esc(a.regle)}${a.futur ? ' · à venir' : ''}</div><div class="m">${esc(a.message)} <a href="#/planning/jour/${a.date}">Voir le jour</a></div></div></li>`).join('');
  const detail = S.vue.detailMois ? `<table class="mois-table"><thead><tr><th>Mois</th><th>Fait</th><th>Dû</th><th>Solde</th></tr></thead><tbody>${b.mois.map((x, i) => x ? `<tr><td>${esc(M.MOIS[i].replace(/^./, (c) => c.toUpperCase()))}</td><td>${M.formatDuree(x.realise)}</td><td>${M.formatDuree(x.theorique)}</td><td class="${x.solde < 0 ? 'neg' : 'pos'}">${M.formatDuree(x.solde, true)}</td></tr>` : '').join('')}</tbody></table>` : '';
  const info = S.vue.info ? INFOS(R)[S.vue.info] : null;
  return {
    nav: 'compteurs',
    html: `${barreHaut()}<div class="ligne-titre"><h1>Compteurs <span class="pale">${y}</span></h1>
        <div class="fleches"><a href="#/compteurs/${y - 1}" aria-label="Année précédente">${ic('gauche')}</a><a href="#/compteurs/${y + 1}" aria-label="Année suivante">${ic('droite')}</a></div></div>
      <div class="page" style="margin-top:1rem">
        <section class="carte sombre" data-tour="solde" aria-label="Solde de l'année">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem"><p class="etiquette">Solde au ${M.courte(b.jusqua)}${b.depart && b.depart > `${y}-01-01` ? ` · suivi depuis le ${M.courte(b.depart)}` : ''}</p>${q('solde')}</div>
          <div style="display:flex;align-items:baseline;gap:.625rem;margin-top:.25rem;flex-wrap:wrap"><span class="geant">${M.formatDuree(b.solde, true)}</span><span style="font-size:.875rem;color:var(--carte-sombre-texte)">${b.solde >= 0 ? 'au-dessus de ton dû' : 'en dessous de ton dû'}</span></div>
          <p class="petit" style="margin:.375rem 0 0">Fait ${M.formatDuree(b.realise)} − dû ${M.formatDuree(b.theorique)}${b.report ? ` · ${b.reportAuto ? `report ${y - 1}` : 'solde de départ'} ${M.formatDuree(b.report, true)}` : ''}${badgeProvisoire(S.cfg, 'regles.valeurJourneeHeures')}</p>
          <div class="barres" role="img" aria-label="Solde de chaque mois">${barres}</div>
          <div class="barres-l" aria-hidden="true">${'JFMAMJJASOND'.split('').map((l) => `<span>${l}</span>`).join('')}</div>
          <button type="button" class="lien-clair" id="detail">${S.vue.detailMois ? 'Masquer le détail' : 'Détail mois par mois'}</button>
          ${detail}
        </section>
        ${b.manquants.length ? `<a class="carte ambre" href="#/jour/${b.manquants[0]}" style="text-decoration:none;display:flex;gap:.625rem">${ic('horloge')}<span><b style="display:block;font-size:.875rem">${pl(b.manquants.length, 'jour')} de semaine sans saisie</b><span class="petit">Le solde est faussé tant qu'ils restent vides. Premier : ${M.courte(b.manquants[0])}.</span></span></a>` : ''}

        <section class="liste" data-tour="alertes" aria-label="Garanties minimales">
          <div class="entete-bloc"><h2>Garanties minimales</h2>${q('garanties')}</div>
          ${S.etat.reglages.controles ? `<ul style="list-style:none;margin:0;padding:0">${listeAlertes}
          ${alertes.length > 3 && !S.vue.toutesAlertes ? `<li><button id="toutes" class="lien" style="border-top:1px solid var(--filet2);font-weight:700;color:var(--rouge-texte)">Voir les ${alertes.length} alertes</button></li>` : ''}
          ${regles.filter((r) => !vues.has(r)).map((r) => `<li class="regle-ok"><span>${r}</span><span class="ok">${ic('coche')}Respecté</span></li>`).join('')}</ul>`
          : '<p class="petit" style="padding:0 .875rem .875rem;margin:0">Contrôles désactivés dans les réglages.</p>'}
        </section>

        <p class="etiquette">Congés et repos</p>
        <div class="tuiles">
          ${tuile('conges', 'Congés annuels', caReste, ` / ${caDroit}`, b.bonusHS || b.bonusFrac ? `${pl(b.bonusHS + b.bonusFrac, 'jour')} gagné${b.bonusHS + b.bonusFrac > 1 ? 's' : ''} (hors saison, fractionnement)` : `${b.caPris} posé${b.caPris > 1 ? 's' : ''}, dont ${b.caHorsSaison} hors saison`, pct(caReste, caDroit), 'var(--kp-vert)')}
          ${tuile('rtt', `RTT${badgeProvisoire(S.cfg, 'regles.rttParAn')}`, rttReste, ` / ${b.rttDroit}`, `${b.rttPris} posé${b.rttPris > 1 ? 's' : ''} dans l'année`, pct(rttReste, b.rttDroit), 'var(--kp-azur)')}
          ${tuile('cet', 'CET', cet.solde, ' j', `${cet.epargne} épargné${cet.epargne > 1 ? 's' : ''} · ${cet.pris} pris`, null, '', '<a class="lien-tuile" href="#/cet">Gérer mon CET</a>')}
          ${tuile('rh', `Repos hebdo${badgeProvisoire(S.cfg, 'regles.rhParAn')}`, b.rhPris, ' RH', `repère : ${b.rhRepere} sur une année pleine`, pct(b.rhPris, b.rhRepere), 'var(--kp-gris)')}
          ${tuile('ge', `Garde d'enfant${badgeProvisoire(S.cfg, 'regles.gardeEnfantJours')}`, b.gePris, ` / ${b.geDroit} j`, 'autorisations d\'absence', pct(b.gePris, b.geDroit), 'var(--kp-ambre)')}
        </div>

        <p class="etiquette">Heures et sujétions</p>
        <div class="tuiles">
          ${tuile('hs', 'Heures sup et récup', M.formatDuree(Math.max(0, resteHS)), '<span style="font-size:.75rem"> à récupérer</span>', `${M.formatDuree(b.depassements)} en plus · ${M.formatDuree(b.recupMin)} récupérées`, null, '')}
          ${tuile('djf', 'Dimanches et fériés', b.djfJours, ' j', `${M.formatDuree(b.djfMinutes)} · ${pl(b.dimanchesTravailles, 'dimanche')}, ${pl(b.feriesTravailles, 'férié')}${b.pointDepart && b.pointDepart.djfJours ? `, + ${b.pointDepart.djfJours} du relevé` : ''}${b.djfMinutes ? `<br>≈ ${euros(b.djfMinutes / 480 * R.indemniteDimancheFerie8h)} d'indemnité` : ''}`, null, '')}
          ${tuile('nuit', 'Nuits travaillées', b.nuits, b.nuits > 1 ? ' nuits' : ' nuit', `${M.formatDuree(b.nuit)} de nuit${b.nuit && tauxH ? `<br>≈ ${euros(b.nuit / 60 * tauxH * R.majorationNuitPct / 100)} de majoration` : ''}`, null, '')}
        </div>
        <div class="rangee"><a class="btn" href="#/releve/${y}">${ic('imprimer')}Relevé annuel</a><a class="btn" href="#/report/${y}">Point de départ</a></div>
      </div>
      ${info ? `<div class="voile-panneau" data-fermer-info></div><section class="panneau-bas panneau-info" role="dialog" aria-label="${esc(info.titre)}">
        <div class="poignee" aria-hidden="true"></div>
        <div style="display:flex;justify-content:space-between;align-items:center"><h2 style="font-size:1.25rem;font-stretch:85%">${esc(info.titre)}</h2><button type="button" class="btn-icone" data-fermer-info aria-label="Fermer">${ic('fermer')}</button></div>
        ${info.p.map((t) => `<p class="texte">${esc(t)}</p>`).join('')}
        ${S.vue.info === 'ge' ? `<label class="case-a-cocher"><span><b>Droit doublé</b><small>J'élève seul·e mon enfant, ou mon conjoint n'a pas ce droit</small></span><input type="checkbox" id="geDouble" ${S.etat.profil && S.etat.profil.geDouble ? 'checked' : ''}></label>` : ''}
        ${S.vue.info === 'garanties' ? '<a class="btn plein" href="https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000398298" target="_blank" rel="noopener">Lire le décret sur Légifrance</a>' : ''}
      </section>` : ''}`,
    apres(el) {
      const t = el.querySelector('#toutes'); if (t) t.onclick = () => { S.vue.toutesAlertes = true; S.rendre(); };
      el.querySelector('#detail').onclick = () => { S.vue.detailMois = !S.vue.detailMois; S.rendre(); };
      el.querySelectorAll('[data-info]').forEach((b2) => b2.onclick = () => { S.vue.info = b2.dataset.info; S.rendre(); });
      el.querySelectorAll('[data-fermer-info]').forEach((b2) => b2.onclick = () => { S.vue.info = null; S.rendre(); });
      const g = el.querySelector('#geDouble'); if (g) g.onchange = () => { S.etat.profil = { ...(S.etat.profil || {}), geDouble: g.checked }; sauver(); S.rendre(); };
    }
  };
}

// ---------- CET ----------
export function vueCet() {
  const cet = M.soldeCet(S.etat, S.cfg);
  const mv = S.etat.cet.mouvements.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return {
    html: `${enteteRetour('Mon CET', '#/compteurs')}
      <div class="page" style="margin-top:.75rem">
        <section class="carte sombre"><p class="etiquette">Solde</p><p class="geant" style="margin:.25rem 0 0">${cet.solde} <span style="font-size:1.25rem;font-weight:600">jour${Math.abs(cet.solde) > 1 ? 's' : ''}</span></p><p class="petit" style="margin:.375rem 0 0">${cet.epargne} épargné${cet.epargne > 1 ? 's' : ''} · ${cet.pris} pris avec le code CET dans le planning</p></section>
        <section class="carte" style="display:flex;flex-direction:column;gap:.625rem">
          <h2>Noter un mouvement</h2>
          <div class="segment" role="group" aria-label="Sens"><button type="button" data-s="1" aria-pressed="true">Je verse des jours</button><button type="button" data-s="-1" aria-pressed="false">Jours payés ou retirés</button></div>
          <div class="rangee"><label class="champ"><span>Date</span><input type="date" id="date" value="${M.aujourdhui()}"></label><label class="champ"><span>Jours</span><input type="number" inputmode="decimal" id="jours" min="0.5" max="60" step="0.5" placeholder="0"></label></div>
          <label class="champ"><span>Note</span><input id="note" maxlength="80" placeholder="Ex. : reliquat de congés 2026"></label>
          <button class="btn principal" id="ajouter">Ajouter</button>
        </section>
        ${mv.length ? `<ul class="liste">${mv.map((m) => `<li><div class="ligne"><span>${esc(M.courte(m.date))} ${m.date.slice(0, 4)}<span class="sous">${esc(m.note || (m.jours > 0 ? 'Versement' : 'Retrait'))}</span></span><span style="display:flex;align-items:center;gap:.5rem"><b class="${m.jours < 0 ? 'neg' : 'pos'}">${m.jours > 0 ? '+' : '−'}${Math.abs(m.jours)} j</b><button type="button" class="btn-icone" data-suppr="${esc(m.id)}" aria-label="Supprimer ce mouvement">${ic('fermer')}</button></span></div></li>`).join('')}</ul>` : '<div class="liste"><p class="vide-etat">Aucun mouvement noté. Si tu as déjà un CET, commence par y inscrire ton solde actuel.</p></div>'}
        <p class="petit" style="margin:0">Pour utiliser un jour de CET, pose le code <b>CET</b> dans ton planning : il est retiré du solde automatiquement.</p>
      </div>`,
    apres(el) {
      let sens = 1;
      el.querySelectorAll('[data-s]').forEach((b) => b.onclick = () => { sens = Number(b.dataset.s); el.querySelectorAll('[data-s]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });
      el.querySelector('#ajouter').onclick = () => {
        const j = Number(el.querySelector('#jours').value); if (!(j > 0)) { toast('Indique un nombre de jours'); return; }
        S.etat.cet.mouvements.push({ id: 'cet-' + Date.now(), date: el.querySelector('#date').value || M.aujourdhui(), jours: sens * j, note: el.querySelector('#note').value.trim() });
        sauver(); toast('Mouvement ajouté'); S.rendre();
      };
      el.querySelectorAll('[data-suppr]').forEach((b) => b.onclick = () => { S.etat.cet.mouvements = S.etat.cet.mouvements.filter((m) => m.id !== b.dataset.suppr); sauver(); S.rendre(); });
    }
  };
}
