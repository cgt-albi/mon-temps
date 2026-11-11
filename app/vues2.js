// Mon Temps — écrans Syndicat, Réglages, Sauvegarde, Relevé, Accueil.
import { carteElections } from './extras.js';
import * as M from './moteur.js';
import * as St from './stockage.js';
import { S, codes, sauver, aller, joursDepuisSauvegarde, appliquerAffichage } from './etat.js';
import { esc, ic, chevron, toast, enteteRetour, telechargerFichier, mailto, badgeProvisoire, media, marque } from './commun.js';
import * as Visite from './visite.js';
import { barreHaut } from './entete.js';
import { iconeReseau, NOMS } from './reseaux.js';

const profil = () => S.etat.profil || {};
const signature = () => { const p = profil(); return [p.prenom, p.metier, p.service].filter(Boolean).join(' — '); };
const pasDeMail = (cle) => !S.cfg.contacts || !S.cfg.contacts[cle];
const lienMail = (cle, sujet, corps, cc) => mailto(S.cfg.contacts[cle] || '', sujet, corps, cc);

// ---------- Syndicat ----------
export function vueSyndicat() {
  const c = S.cfg.contacts || {}; const r = S.cfg.reseaux || {}; const today = M.aujourdhui();
  const rdv = (S.cfg.agenda || []).filter((x) => x && x.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const actus = (S.cfg.actualites || []).filter((x) => x && x.titre).map((x, i) => ({ ...x, i })).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const vues = S.etat.reglages.actusVues || '';
  const lien = (h, t, s) => `<li><a class="lien" href="${h}"><span>${t}<span class="sous">${s}</span></span>${chevron()}</a></li>`;
  const ligneContact = (icone, titre, valeur, href) => `<li>${href ? `<a class="lien" href="${esc(href)}"${href.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>` : '<div class="ligne">'}<span style="display:flex;gap:.75rem;align-items:flex-start">${ic(icone)}<span>${titre}<span class="sous">${esc(valeur)}</span></span></span>${href ? chevron() + '</a>' : '</div>'}</li>`;
  const contacts = [
    c.telephone && ligneContact('telephone', 'Téléphone', c.telephone, 'tel:' + c.telephone.replace(/[^\d+]/g, '')),
    c.mailGeneral && ligneContact('mail', 'Écrire au syndicat', c.mailGeneral, mailto(c.mailGeneral, '', '')),
    (c.local || c.permanences) && ligneContact('lieu', 'Le local', [c.local, c.permanences].filter(Boolean).join(' · '), null),
    c.adresse && ligneContact('lieu', 'Adresse', c.adresse, null),
    r.site && ligneContact('web', 'Site internet', r.site.replace(/^https?:\/\//, ''), r.site)
  ].filter(Boolean).join('');
  const reseaux = Object.keys(NOMS).filter((k) => r[k]).map((k) => `<a class="reseau" href="${esc(r[k])}" target="_blank" rel="noopener" aria-label="${NOMS[k]}" title="${NOMS[k]}">${iconeReseau(k, 22)}<span>${NOMS[k]}</span></a>`).join('');
  return {
    nav: 'syndicat',
    html: `${barreHaut()}<div class="ligne-titre"><h1>Syndicat</h1></div>
      <div class="page" style="margin-top:.875rem">
        ${actus.length ? `<p class="etiquette">Actualités</p><div class="actus">${actus.slice(0, 5).map((x) => `<a class="actu" href="#/actu/${x.i}">${x.image ? `<img src="${esc(media(x.image))}" alt="" loading="lazy">` : ''}<span class="actu-t"><span class="petit">${x.date ? esc(M.courte(x.date)) : ''}${x.date && x.date > vues ? ' · <b style="color:var(--rouge-texte)">nouveau</b>' : ''}</span><b>${esc(x.titre)}</b>${x.texte ? `<span class="actu-r">${esc(String(x.texte).slice(0, 110))}${String(x.texte).length > 110 ? '…' : ''}</span>` : ''}</span></a>`).join('')}</div>` : ''}
        ${rdv.length ? `<p class="etiquette">À venir</p>${rdv.slice(0, 3).map((x) => `<section class="carte sombre" style="display:flex;align-items:center;gap:.875rem"><div class="date-bloc" style="border-color:#5A544D"><b>${Number(x.date.slice(8))}</b><span style="color:var(--carte-sombre-texte)">${esc(M.MOIS_COURTS[Number(x.date.slice(5, 7)) - 1].replace('.', ''))}</span></div><div><b style="display:block;font-size:.9375rem">${esc(x.titre)}</b>${x.lieu ? `<span class="petit">${esc(x.lieu)}</span>` : ''}</div></section>`).join('')}` : ''}
        ${carteElections()}
        <p class="etiquette" style="margin-top:.25rem">Agir</p>
        <ul class="liste">
          ${lien('#/greve', 'Déclarer mon intention de grève', 'Le mail à ton cadre, prêt à partir')}
          ${lien('#/desiderata', 'Désiderata de congés', 'Tes dates, mises en forme pour ton cadre')}
          ${lien('#/courriers', 'Préparer un courrier', '14 modèles : heures, planning, temps partiel, alerte…')}
          ${lien('#/droits', 'Mes droits', 'Temps de travail et repos, en clair')}
        </ul>
        <p class="etiquette">Confidentiel</p>
        <ul class="liste">
          ${lien('#/signalement/violence', 'Signaler une violence', 'De la hiérarchie, de collègues, de patients')}
          ${lien('#/signalement/discrimination', 'Signaler une discrimination', 'Et demander un rendez-vous')}
          ${lien('#/signalement/exposition', 'Signaler une exposition', 'Amiante, produits chimiques, agents biologiques')}
        </ul>
        <p class="petit" style="margin:-.375rem 0 0">Ces messages partent de ta propre messagerie, directement aux délégué·es. L'appli ne garde rien.</p>
        <a class="btn sombre plein" href="#/contact">${ic('telephone')}Contacter le syndicat</a>
        ${contacts ? `<p class="etiquette">Nous trouver</p><ul class="liste">${contacts}</ul>` : '<div class="carte"><p class="petit" style="margin:0">Les coordonnées du syndicat seront ajoutées très bientôt.</p></div>'}
        ${reseaux ? `<p class="etiquette">Nous suivre</p><div class="reseaux">${reseaux}</div>` : ''}
        ${pasDeMail('mailAdhesion') ? '' : `<a class="btn principal plein" href="${esc(lienMail('mailAdhesion', `Adhésion — ${S.cfg.syndicat}`, `Bonjour,\n\nJe souhaite adhérer à la CGT. Pouvez-vous me recontacter ?\n\n${signature()}\n`))}">Adhérer à la CGT</a>`}
      </div>`,
    apres() {
      const max = actus.reduce((m, x) => (x.date && x.date > m ? x.date : m), vues);
      if (max !== vues && !S.demo) { S.etat.reglages.actusVues = max; sauver(); }
    }
  };
}

export function vueActu(p) {
  const x = (S.cfg.actualites || [])[Number(p[1])];
  if (!x) return vueSyndicat();
  return {
    html: `${enteteRetour('Actualité', '#/syndicat')}
      <article class="page" style="margin-top:.75rem">
        ${x.image ? `<img src="${esc(media(x.image))}" alt="" style="width:100%;border-radius:var(--r);display:block">` : ''}
        ${x.date ? `<p class="etiquette">${esc(M.longue(x.date))}</p>` : ''}
        <h2 style="font-size:1.5rem;font-stretch:85%;line-height:1.15">${esc(x.titre)}</h2>
        ${x.texte ? String(x.texte).split(/\n{2,}/).map((para) => `<p class="texte" style="white-space:pre-line">${esc(para)}</p>`).join('') : ''}
        ${x.lien ? `<a class="btn plein" href="${esc(x.lien)}" target="_blank" rel="noopener">${ic('web')}En savoir plus</a>` : ''}
      </article>`
  };
}

function champsAgent() {
  const p = profil();
  return `<div class="rangee"><label class="champ"><span>Nom et prénom</span><input id="nom" value="${esc(p.nomComplet || p.prenom || '')}" autocomplete="name"></label></div>
    <div class="rangee"><label class="champ"><span>Métier</span><input id="metier" value="${esc(p.metier || '')}"></label><label class="champ"><span>Service</span><input id="service" value="${esc(p.service || '')}"></label></div>`;
}
const lireAgent = (el) => ({ nom: el.querySelector('#nom').value.trim(), metier: el.querySelector('#metier').value.trim(), service: el.querySelector('#service').value.trim() });

// ---------- Grève ----------
export function vueGreve() {
  S.vue.greve = S.vue.greve || { dates: [M.ajouterJours(M.aujourdhui(), 2)], cadre: '' };
  const G = S.vue.greve;
  return {
    html: `${enteteRetour('Grève', '#/syndicat')}
      <div class="page" style="margin-top:.75rem">
        <p class="texte">Faire grève est un droit. Prévenir de ton intention aide à organiser la continuité des soins ; tu restes libre de changer d'avis le jour même.</p>
        ${champsAgent()}
        <p class="etiquette">Jour(s) de grève</p>
        ${G.dates.map((d, i) => `<div class="rangee" style="align-items:end"><label class="champ" style="flex:3"><span class="sr">Date ${i + 1}</span><input type="date" data-i="${i}" value="${esc(d)}"></label>${G.dates.length > 1 ? `<button class="btn petit-btn" data-suppr="${i}" aria-label="Retirer cette date" style="flex:0 0 2.875rem;height:2.875rem">${ic('fermer')}</button>` : ''}</div>`).join('')}
        <button class="btn petit-btn" id="ajout" style="align-self:flex-start">${ic('plus')}Ajouter un jour</button>
        <label class="champ"><span>Adresse mail de ton cadre</span><input type="email" id="cadre" value="${esc(G.cadre)}" placeholder="facultatif" autocomplete="off"></label>
        <a class="btn principal plein" id="envoyer" href="#">${ic('mail')}Préparer le mail</a>
        <p class="petit" style="margin:0">${S.cfg.contacts.mailGreve ? 'Le syndicat sera mis en copie.' : ''} Le mail s'ouvre dans ta messagerie : relis-le avant d'envoyer.</p>
      </div>`,
    apres(el) {
      const lire = () => { el.querySelectorAll('[data-i]').forEach((i) => { G.dates[Number(i.dataset.i)] = i.value; }); G.cadre = el.querySelector('#cadre').value; };
      el.querySelector('#ajout').onclick = () => { lire(); G.dates.push(M.ajouterJours(G.dates[G.dates.length - 1] || M.aujourdhui(), 1)); S.rendre(); };
      el.querySelectorAll('[data-suppr]').forEach((b) => b.onclick = () => { lire(); G.dates.splice(Number(b.dataset.suppr), 1); S.rendre(); });
      el.querySelector('#envoyer').onclick = (e) => {
        lire(); const a = lireAgent(el); const dates = G.dates.filter(Boolean).sort();
        if (!dates.length) { e.preventDefault(); toast('Choisis au moins une date'); return; }
        const corps = `Bonjour,\n\nJe vous informe de mon intention de participer au mouvement de grève ${dates.length > 1 ? 'les jours suivants' : 'le'} :\n${dates.map((d) => '- ' + M.longue(d)).join('\n')}\n\nCordialement,\n${[a.nom, a.metier, a.service].filter(Boolean).join('\n')}\n`;
        el.querySelector('#envoyer').href = mailto(G.cadre, `Déclaration d'intention de grève — ${a.nom || ''}`.trim(), corps, S.cfg.contacts.mailGreve);
      };
    }
  };
}

// ---------- Désiderata ----------
export function vueDesiderata() {
  S.vue.desid = S.vue.desid || { periodes: [{ du: '', au: '', type: 'CA' }], cadre: '', com: '' };
  const D = S.vue.desid;
  return {
    html: `${enteteRetour('Désiderata', '#/syndicat')}
      <div class="page" style="margin-top:.75rem">
        <p class="texte">Note tes souhaits de congés ; l'appli les met en forme pour ton cadre.</p>
        ${champsAgent()}
        ${D.periodes.map((p, i) => `<div class="carte" style="display:flex;flex-direction:column;gap:.5rem"><div class="rangee"><label class="champ"><span>Du</span><input type="date" data-p="${i}" data-k="du" value="${esc(p.du)}"></label><label class="champ"><span>Au</span><input type="date" data-p="${i}" data-k="au" value="${esc(p.au)}"></label></div>
          <div class="rangee" style="align-items:end"><label class="champ"><span>Nature</span><select data-p="${i}" data-k="type">${['CA', 'RTT', 'Récupération', 'CET', 'Autre'].map((t) => `<option ${p.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>${D.periodes.length > 1 ? `<button class="btn petit-btn" data-suppr="${i}" style="flex:0 0 auto;height:2.875rem">Retirer</button>` : ''}</div></div>`).join('')}
        <button class="btn petit-btn" id="ajout" style="align-self:flex-start">${ic('plus')}Ajouter une période</button>
        <label class="champ"><span>Commentaire</span><textarea id="com" placeholder="Ex. : vacances scolaires, ordre de préférence…">${esc(D.com)}</textarea></label>
        <label class="champ"><span>Adresse mail de ton cadre</span><input type="email" id="cadre" value="${esc(D.cadre)}" placeholder="facultatif"></label>
        <a class="btn principal plein" id="envoyer" href="#">${ic('mail')}Préparer le mail</a>
      </div>`,
    apres(el) {
      const lire = () => { el.querySelectorAll('[data-p]').forEach((i) => { D.periodes[Number(i.dataset.p)][i.dataset.k] = i.value; }); D.com = el.querySelector('#com').value; D.cadre = el.querySelector('#cadre').value; };
      el.querySelector('#ajout').onclick = () => { lire(); D.periodes.push({ du: '', au: '', type: 'CA' }); S.rendre(); };
      el.querySelectorAll('[data-suppr]').forEach((b) => b.onclick = () => { lire(); D.periodes.splice(Number(b.dataset.suppr), 1); S.rendre(); });
      el.querySelector('#envoyer').onclick = (e) => {
        lire(); const a = lireAgent(el); const ps = D.periodes.filter((p) => p.du);
        if (!ps.length) { e.preventDefault(); toast('Indique au moins une date de début'); return; }
        const corps = `Bonjour,\n\nVoici mes souhaits de congés :\n${ps.map((p) => `- ${p.type} : du ${M.longue(p.du)}${p.au && p.au !== p.du ? ` au ${M.longue(p.au)}` : ''}`).join('\n')}\n${D.com ? `\n${D.com}\n` : ''}\nCordialement,\n${[a.nom, a.metier, a.service].filter(Boolean).join('\n')}\n`;
        el.querySelector('#envoyer').href = mailto(D.cadre, `Désiderata de congés — ${a.nom || ''}`.trim(), corps);
      };
    }
  };
}

// ---------- Mes droits ----------
const FICHES = [
  { titre: 'Repos entre deux journées', texte: 'Au moins 12 heures de repos consécutives entre deux journées de travail. Ce minimum peut être abaissé à 11 heures seulement par décision du chef d\'établissement, après un accord collectif.', lien: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000398298', source: 'Décret 2002-9, art. 6' },
  { titre: 'Repos de la semaine', texte: 'Au moins 36 heures de repos consécutives chaque semaine. Et sur deux semaines : 4 jours de repos, dont au moins 2 qui se suivent, dont un dimanche.', lien: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000398298', source: 'Décret 2002-9, art. 6' },
  { titre: '48 heures au maximum', texte: 'Sur n\'importe quelle période de 7 jours, le travail effectif ne peut pas dépasser 48 heures, heures supplémentaires comprises.', lien: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000398298', source: 'Décret 2002-9, art. 6' },
  { titre: 'Durée d\'une journée', texte: 'En travail continu : 9 heures au plus pour une équipe de jour, 10 heures pour une équipe de nuit. Une dérogation est possible quand la continuité du service l\'exige, mais la journée ne peut jamais s\'étendre sur plus de 12 heures.', lien: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000398298', source: 'Décret 2002-9, art. 7' },
  { titre: 'Journée en deux fois', texte: 'Si ta journée est coupée en deux, elle ne peut pas s\'étaler sur plus de 10 h 30 du début à la fin, et chacune des deux parties dure au moins 3 heures.', lien: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000398298', source: 'Décret 2002-9, art. 7' },
  { titre: 'La pause', texte: 'Dès que tu travailles plus de 6 heures d\'affilée, tu as droit à une pause de 20 minutes.', lien: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000398298', source: 'Décret 2002-9, art. 7' }
];
export function vueDroits() {
  const fiches = FICHES.concat(S.cfg.droits || []);
  return {
    html: `${enteteRetour('Mes droits', '#/syndicat')}
      <div class="page" style="margin-top:.75rem">
        <p class="texte">Les règles de base du temps de travail à l'hôpital public, en clair. Chaque fiche renvoie au texte officiel.</p>
        ${fiches.map((f) => `<details class="carte"><summary style="font-weight:700;cursor:pointer;min-height:1.75rem;display:flex;align-items:center">${esc(f.titre)}</summary><p class="texte" style="margin-top:.5rem">${esc(f.texte)}</p>${f.lien ? `<p class="petit" style="margin:.5rem 0 0"><a href="${esc(f.lien)}" target="_blank" rel="noopener">${esc(f.source || 'Texte officiel')}</a></p>` : ''}</details>`).join('')}
        <p class="petit">Les accords propres au ${esc(S.cfg.etablissement)} peuvent préciser ces règles. En cas de doute, parles-en au syndicat.</p>
      </div>`
  };
}

// ---------- Réglages ----------
export function vueReglages() {
  const p = profil(); const R = S.etat.reglages;
  const perso = S.etat.codesPerso.map((c) => c.code);
  const C = [...codes().values()];
  const seg = (nom, valeurs, actuel) => `<div class="segment" role="group" aria-label="${nom}" style="width:12rem">${valeurs.map(([v, l, a]) => `<button type="button" data-${nom}="${v}" aria-pressed="${String(actuel) === String(v)}" ${a ? `aria-label="${a}"` : ''}>${l}</button>`).join('')}</div>`;
  const js = joursDepuisSauvegarde();
  return {
    html: `${enteteRetour('Réglages')}
      <div class="page" style="margin-top:.75rem">
        <p class="etiquette">Mon poste</p>
        <div class="carte" style="display:flex;flex-direction:column;gap:.625rem">
          <label class="champ"><span>Prénom</span><input id="prenom" value="${esc(p.prenom || '')}" autocomplete="given-name" placeholder="facultatif"></label>
          <div class="rangee"><label class="champ"><span>Métier</span><select id="metier"><option value="">—</option>${S.cfg.metiers.map((m) => `<option ${p.metier === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></label>
            <label class="champ"><span>Quotité</span><select id="quotite">${[100, 90, 80, 70, 60, 50].map((q) => `<option value="${q}" ${Number(p.quotite || 100) === q ? 'selected' : ''}>${q} %</option>`).join('')}</select></label></div>
          <label class="champ"><span>Service</span><input id="service" value="${esc(p.service || '')}" placeholder="facultatif"></label>
        </div>
        <p class="etiquette">Mes codes horaires</p>
        <ul class="liste">${C.filter((c) => c.debut).map((c) => `<li><a class="lien" href="#/code/${encodeURIComponent(c.code)}"><span style="display:flex;gap:.75rem;align-items:baseline"><i class="pt k-${c.teinte}" style="width:.75rem;height:.75rem;align-self:center"></i><b style="font-stretch:82%;min-width:3rem">${esc(c.code)}</b><span style="color:var(--encre2)">${esc(c.debut)} – ${esc(c.fin)}${c.debut2 ? ` + ${esc(c.debut2)} – ${esc(c.fin2)}` : ''}</span></span><span class="val">${M.formatDuree(M.dureeEffectiveCode(c))}${perso.includes(c.code) ? ' · perso' : ''}${chevron()}</span></a></li>`).join('')}
          <li><a class="lien" href="#/code/nouveau" style="color:var(--rouge-texte);font-weight:700">${ic('plus')}<span style="flex:1">Ajouter un code</span></a></li></ul>
        <p class="petit" style="margin:-.375rem 0 0">Les codes de l'établissement sont mis à jour par le syndicat. Tu peux ajouter les tiens ou ajuster un horaire.</p>
        <p class="etiquette">Affichage</p>
        <div class="carte" style="display:flex;flex-direction:column;gap:.75rem">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:.75rem"><span>Thème</span>${seg('theme', [['clair', 'Clair'], ['sombre', 'Sombre'], ['auto', 'Auto']], R.theme)}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:.75rem"><span>Taille du texte</span>${seg('taille', [[0, '<span style="font-size:.8125rem">A</span>', 'Normale'], [1, '<span style="font-size:1rem">A</span>', 'Grande'], [2, '<span style="font-size:1.1875rem">A</span>', 'Très grande']], R.taille || 0)}</div>
          <label style="display:flex;justify-content:space-between;align-items:center;gap:.75rem;cursor:pointer"><span>Contrôles légaux<span class="petit" style="display:block">Alertes sur le repos, les 48h, l'amplitude</span></span><input type="checkbox" id="controles" ${R.controles ? 'checked' : ''} style="width:1.375rem;height:1.375rem;accent-color:var(--rouge)"></label>
        </div>
        <ul class="liste">
          <li><a class="lien" href="#/sauvegarde"><span>Sauvegarde et transfert</span><span class="val" style="color:${js === null || js > 30 ? 'var(--ambre)' : 'var(--sourdine)'};font-weight:700">${js === null ? 'Jamais faite' : js === 0 ? 'Aujourd\'hui' : `Il y a ${js} j`}${chevron()}</span></a></li>
          <li><button class="lien" id="visite"><span>Revoir la visite guidée</span>${chevron()}</button></li>
          <li><a class="lien" href="#/verification"><span>Vérifier les chiffres de l'appli</span>${chevron()}</a></li>
          <li><a class="lien" href="#/confidentialite"><span>Confidentialité</span>${chevron()}</a></li>
          <li><a class="lien" href="../"><span>Page d'accueil de l'appli</span>${chevron()}</a></li>
        </ul>
        <button class="btn plein danger" id="toutEffacer">Effacer toutes mes données</button>
      </div>`,
    apres(el) {
      const majProfil = () => {
        S.etat.profil = { ...(S.etat.profil || {}), prenom: el.querySelector('#prenom').value.trim(), metier: el.querySelector('#metier').value, quotite: Number(el.querySelector('#quotite').value), service: el.querySelector('#service').value.trim() };
        sauver(); toast('Enregistré');
      };
      ['prenom', 'metier', 'quotite', 'service'].forEach((k) => { el.querySelector('#' + k).onchange = majProfil; });
      el.querySelectorAll('[data-theme]').forEach((b) => b.onclick = () => { R.theme = b.dataset.theme; appliquerAffichage(); sauver(); S.rendre(); });
      el.querySelectorAll('[data-taille]').forEach((b) => b.onclick = () => { R.taille = Number(b.dataset.taille); appliquerAffichage(); sauver(); S.rendre(); });
      el.querySelector('#controles').onchange = (e) => { R.controles = e.target.checked; sauver(); };
      el.querySelector('#visite').onclick = () => Visite.demarrerEssai();
      el.querySelector('#toutEffacer').onclick = async () => {
        if (S.demo) { toast('Impossible en mode essai'); return; }
        const r = prompt('Tout ton planning, tes preuves et tes réglages seront effacés de ce téléphone. Pense à faire une sauvegarde avant.\n\nTape EFFACER pour confirmer.');
        if (r !== 'EFFACER') return;
        await St.effacerTout(); S.etat = St.etatVide(); appliquerAffichage(); aller('#/bienvenue');
      };
    }
  };
}

export function vueCode(p) {
  const nouveau = p[1] === 'nouveau';
  const exist = nouveau ? null : codes().get(p[1]);
  const c = exist || { code: '', libelle: '', type: 'travail', debut: '08:00', fin: '16:00', pauseMin: 30 };
  const estPerso = exist && S.etat.codesPerso.some((x) => x.code === exist.code);
  const officiel = exist && S.cfg.codes.some((x) => x.code === exist.code);
  const types = [['travail', 'Travail de jour'], ['nuit', 'Travail de nuit'], ['repos', 'Repos'], ['rtt', 'RTT'], ['conge', 'Congé'], ['cet', 'Jour de CET'], ['recup', 'Récupération'], ['assimile', 'Absence comptée (maladie, formation…)']];
  return {
    html: `${enteteRetour(nouveau ? 'Nouveau code' : c.code, '#/reglages')}
      <div class="page" style="margin-top:.75rem">
        ${officiel ? `<p class="petit" style="margin:0">Code de l'établissement${badgeProvisoire(S.cfg, 'codes.pause')}. Si tu le modifies, ta version remplace celle du syndicat sur ton téléphone uniquement.</p>` : ''}
        <div class="rangee"><label class="champ" style="flex:1"><span>Code</span><input id="code" value="${esc(c.code)}" maxlength="6" ${nouveau ? '' : 'readonly'} style="text-transform:uppercase"></label>
          <label class="champ" style="flex:2"><span>Libellé</span><input id="libelle" value="${esc(c.libelle || '')}"></label></div>
        <div id="bloc-couleur"><p class="etiquette" style="margin-bottom:.375rem">Couleur dans le planning</p><div class="nuancier" role="group" aria-label="Couleur">${['', ...M.PALETTE, 'indigo'].map((t) => `<button type="button" data-teinte="${t}" class="${t ? 'k k-' + t : 'auto'}" aria-pressed="${(c.couleur || '') === t}" aria-label="${t || 'Automatique'}">${t ? '' : 'Auto'}</button>`).join('')}</div></div>
        <label class="champ"><span>Type</span><select id="type">${types.map(([v, l]) => `<option value="${v}" ${c.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <div id="horaires" style="display:flex;flex-direction:column;gap:.75rem">
          <div class="rangee"><label class="champ"><span>Début</span><input type="time" id="debut" value="${esc(c.debut || '')}"></label><label class="champ"><span>Fin</span><input type="time" id="fin" value="${esc(c.fin || '')}"></label></div>
          <label class="champ"><span>Pause non comptée (minutes)</span><input type="number" inputmode="numeric" id="pause" min="0" max="180" value="${Number(c.pauseMin) || 0}"></label>
          <label class="case-a-cocher"><span><b>Journée en deux fois</b><small>Service coupé</small></span><input type="checkbox" id="coupe" ${c.debut2 ? 'checked' : ''}></label>
          <div class="rangee" id="seg2" ${c.debut2 ? '' : 'hidden'}><label class="champ"><span>Reprise</span><input type="time" id="debut2" value="${esc(c.debut2 || '')}"></label><label class="champ"><span>Fin</span><input type="time" id="fin2" value="${esc(c.fin2 || '')}"></label></div>
        </div>
        <button class="btn principal plein" id="ok">Enregistrer</button>
        ${estPerso ? `<button class="btn plein danger" id="suppr">${officiel ? 'Revenir à la version du syndicat' : 'Supprimer ce code'}</button>` : ''}
      </div>`,
    apres(el) {
      let couleur = c.couleur || '';
      el.querySelectorAll('[data-teinte]').forEach((b) => b.onclick = () => { couleur = b.dataset.teinte; el.querySelectorAll('[data-teinte]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });
      const majVis = () => { const t = el.querySelector('#type').value; el.querySelector('#horaires').hidden = !(t === 'travail' || t === 'nuit'); el.querySelector('#bloc-couleur').hidden = !(t === 'travail' || t === 'nuit'); el.querySelector('#seg2').hidden = !el.querySelector('#coupe').checked; };
      el.querySelector('#type').onchange = majVis; el.querySelector('#coupe').onchange = majVis; majVis();
      el.querySelector('#ok').onclick = () => {
        const code = el.querySelector('#code').value.trim().toUpperCase();
        if (!code) { toast('Indique un code'); return; }
        if (nouveau && codes().has(code)) { toast('Ce code existe déjà'); return; }
        const t = el.querySelector('#type').value; const o = { code, libelle: el.querySelector('#libelle').value.trim() || code, type: t };
        if (c.compte) o.compte = c.compte;
        if (t === 'travail' || t === 'nuit') {
          if (couleur) o.couleur = couleur;
          o.debut = el.querySelector('#debut').value; o.fin = el.querySelector('#fin').value; o.pauseMin = Number(el.querySelector('#pause').value) || 0;
          if (!o.debut || !o.fin) { toast('Indique les heures'); return; }
          if (el.querySelector('#coupe').checked && el.querySelector('#debut2').value && el.querySelector('#fin2').value) { o.debut2 = el.querySelector('#debut2').value; o.fin2 = el.querySelector('#fin2').value; }
        }
        S.etat.codesPerso = S.etat.codesPerso.filter((x) => x.code !== code).concat([o]);
        sauver(); toast('Code enregistré'); aller('#/reglages');
      };
      const s = el.querySelector('#suppr');
      if (s) s.onclick = () => { S.etat.codesPerso = S.etat.codesPerso.filter((x) => x.code !== c.code); sauver(); toast('Fait'); aller('#/reglages'); };
    }
  };
}

export function vueReport(p) {
  const y = /^\d{4}$/.test(p[1] || '') ? Number(p[1]) : Number(M.aujourdhui().slice(0, 4));
  const today = M.aujourdhui();
  const pd = S.etat.departs[y] || {};
  const auto = M.aDesSaisies(S.etat, y - 1) ? M.bilanAnnee(y - 1, S.etat, S.cfg, `${y - 1}-12-31`).solde : null;
  const v = Number(pd.soldeMin) || 0; const a = Math.abs(v);
  const defDate = pd.date || (String(y) === today.slice(0, 4) && !M.aDesSaisies(S.etat, y) ? today : `${y}-01-01`);
  const nb = (id, lib, val, aide) => `<label class="champ"><span>${lib}</span><input type="number" inputmode="numeric" min="0" max="400" id="${id}" value="${val || ''}" placeholder="0">${aide ? `<small class="petit">${aide}</small>` : ''}</label>`;
  const depuisAccueil = S.vue.depuisAccueil;
  return {
    html: `${enteteRetour(`Point de départ ${y}`, depuisAccueil ? '#/bienvenue' : `#/compteurs/${y}`)}
      <div class="page" style="margin-top:.75rem">
        <p class="texte">Tu commences à suivre ton temps en cours d'année ? Recopie ici ce qui s'est passé avant, d'après ton dernier relevé d'heures (écran Octime, relevé papier ou demande à ton cadre). L'appli part de ces chiffres.</p>
        <label class="champ"><span>Je commence le suivi le</span><input type="date" id="date" min="${y}-01-01" max="${y}-12-31" value="${esc(defDate)}"></label>
        <div class="carte" style="display:flex;flex-direction:column;gap:.75rem">
          <h2>Mon solde d'heures à cette date</h2>
          <div class="segment" role="group" aria-label="Signe"><button type="button" data-s="1" aria-pressed="${v >= 0}">Heures en plus</button><button type="button" data-s="-1" aria-pressed="${v < 0}">Heures en moins</button></div>
          <div class="rangee"><label class="champ"><span>Heures</span><input type="number" inputmode="numeric" id="h" min="0" max="999" value="${Math.floor(a / 60) || ''}" placeholder="0"></label><label class="champ"><span>Minutes</span><input type="number" inputmode="numeric" id="m" min="0" max="59" value="${a % 60 || ''}" placeholder="0"></label></div>
          ${auto !== null ? `<button type="button" class="btn petit-btn" id="auto" style="align-self:flex-start">Reprendre mon solde ${y - 1} calculé : ${M.formatDuree(auto, true)}</button>` : ''}
        </div>
        <div class="carte" style="display:flex;flex-direction:column;gap:.75rem">
          <h2>Déjà pris ou travaillés depuis le 1<sup>er</sup> janvier</h2>
          <div class="rangee">${nb('rttPris', 'RTT pris', pd.rttPris)}${nb('caPris', 'Congés annuels pris', pd.caPris)}</div>
          <div class="rangee">${nb('caHorsSaison', 'Dont congés hors saison', pd.caHorsSaison, 'Pris avant mai ou après octobre')}${nb('djfJours', 'Dimanches et fériés travaillés', pd.djfJours)}</div>
        </div>
        <p class="petit" style="margin:0">Pas tous les chiffres ? Remplis ce que tu as : tu pourras compléter plus tard depuis Compteurs › Point de départ.</p>
        <button class="btn principal plein" id="ok">Enregistrer</button>
        ${S.etat.departs[y] ? '<button class="btn plein danger" id="suppr">Supprimer le point de départ</button>' : ''}
      </div>`,
    apres(el) {
      let signe = v < 0 ? -1 : 1;
      const signer = (x) => { signe = x; el.querySelectorAll('[data-s]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.s) === x))); };
      el.querySelectorAll('[data-s]').forEach((b) => b.onclick = () => signer(Number(b.dataset.s)));
      const au = el.querySelector('#auto');
      if (au) au.onclick = () => { signer(auto < 0 ? -1 : 1); el.querySelector('#h').value = Math.floor(Math.abs(auto) / 60); el.querySelector('#m').value = Math.abs(auto) % 60; el.querySelector('#date').value = `${y}-01-01`; };
      const fin = () => { if (depuisAccueil) { S.vue.depuisAccueil = false; S.vue.bv = { ...(S.vue.bv || {}), etape: 3 }; aller('#/bienvenue'); } else aller(`#/compteurs/${y}`); };
      el.querySelector('#ok').onclick = () => {
        const n = (id) => Math.max(0, Number(el.querySelector('#' + id).value) || 0);
        const date = el.querySelector('#date').value || `${y}-01-01`;
        if (date.slice(0, 4) !== String(y)) { toast(`Choisis une date en ${y}`); return; }
        S.etat.departs[y] = { date, soldeMin: signe * (n('h') * 60 + Math.min(59, n('m'))), rttPris: n('rttPris'), caPris: n('caPris'), caHorsSaison: Math.min(n('caHorsSaison'), n('caPris')), djfJours: n('djfJours') };
        sauver(); toast('Point de départ enregistré'); fin();
      };
      const s = el.querySelector('#suppr');
      if (s) s.onclick = () => { delete S.etat.departs[y]; sauver(); toast('Point de départ supprimé'); fin(); };
    }
  };
}

// ---------- Sauvegarde ----------
export function vueSauvegarde() {
  const js = joursDepuisSauvegarde();
  return {
    html: `${enteteRetour('Sauvegarde', S.etat.profil ? '#/reglages' : '#/bienvenue')}
      <div class="page" style="margin-top:.75rem">
        ${S.demo ? '<div class="carte ambre"><b>Mode essai</b><p class="petit" style="margin:.25rem 0 0">La sauvegarde est désactivée pendant l\'essai.</p></div>' : `
        <div class="carte ${js === null || js > 30 ? 'ambre' : ''}" role="status" style="display:flex;gap:.625rem">${ic('horloge')}<span><b style="display:block;font-size:.875rem">${js === null ? 'Aucune sauvegarde pour l\'instant' : js === 0 ? 'Sauvegardé aujourd\'hui' : `Dernière sauvegarde il y a ${js} jour${js > 1 ? 's' : ''}`}</b><span class="petit">Ton planning n'existe que sur ce téléphone. Une sauvegarde par mois suffit.</span></span></div>`}
        <section class="carte" style="display:flex;flex-direction:column;gap:.625rem">
          <h2>Créer un fichier de sauvegarde</h2>
          <p class="petit" style="margin:0">Le fichier est chiffré : sans le mot de passe, personne ne peut le lire. Garde-le où tu veux (mail à toi-même, cloud, clé USB).</p>
          <label class="champ"><span>Mot de passe du fichier</span><input type="password" id="mdp1" autocomplete="new-password" minlength="6"></label>
          <label class="champ"><span>Le même, encore une fois</span><input type="password" id="mdp2" autocomplete="new-password"></label>
          <p class="petit" style="margin:0">Note-le bien : il ne peut pas être retrouvé.</p>
          <button class="btn principal" id="creer" ${S.demo ? 'disabled' : ''}>${ic('cadenas')}Sauvegarder</button>
        </section>
        <section class="carte" style="display:flex;flex-direction:column;gap:.625rem">
          <h2>Restaurer depuis un fichier</h2>
          <p class="petit" style="margin:0">Choisis ton fichier de sauvegarde. Les données actuelles de cet appareil seront remplacées.</p>
          <label class="champ"><span>Fichier de sauvegarde</span><input type="file" id="fichier" accept=".json,application/json"></label>
          <label class="champ"><span>Mot de passe du fichier</span><input type="password" id="mdp3" autocomplete="current-password"></label>
          <button class="btn" id="restaurer" ${S.demo ? 'disabled' : ''}>Restaurer</button>
        </section>
        <section class="carte" style="display:flex;flex-direction:column;gap:.625rem">
          <h2>Passer sur un autre téléphone</h2>
          <p class="petit" style="margin:0">Le plus simple : un code QR qui défile sur l'ancien téléphone, que le nouveau lit avec sa caméra. Rien ne passe par internet.</p>
          <div class="rangee"><a class="btn" href="#/transfert">${ic('qr')}Envoyer</a><a class="btn" href="#/recevoir">${ic('camera')}Recevoir</a></div>
        </section>
        <section class="carte" style="display:flex;flex-direction:column;gap:.5rem">
          <h2>Mettre mon planning dans mon agenda</h2>
          <p class="petit" style="margin:0">Crée un fichier agenda avec tes 3 prochains mois de travail, à ouvrir dans Google Agenda, Outlook ou l'agenda de l'iPhone.</p>
          <button class="btn" id="ics">${ic('telecharger')}Fichier agenda</button>
        </section>
        <p class="petit" id="protege" style="display:flex;gap:.5rem;margin:0"></p>
      </div>`,
    async apres(el) {
      el.querySelector('#creer').onclick = async () => {
        const a = el.querySelector('#mdp1').value, b = el.querySelector('#mdp2').value;
        if (a.length < 6) { toast('Choisis un mot de passe d\'au moins 6 caractères'); return; }
        if (a !== b) { toast('Les deux mots de passe sont différents'); return; }
        const t = await St.chiffrer(S.etat, a);
        const nom = `mon-temps-sauvegarde-${M.aujourdhui()}.json`;
        let partage = false;
        try {
          const f = new File([t], nom, { type: 'application/json' });
          if (navigator.canShare && navigator.canShare({ files: [f] }) && /Android|iPhone|iPad/i.test(navigator.userAgent)) { await navigator.share({ files: [f], title: 'Sauvegarde Mon Temps' }); partage = true; }
        } catch (e) { if (e && e.name === 'AbortError') return; }
        if (!partage) telechargerFichier(nom, t, 'application/json');
        S.etat.derniereSauvegarde = new Date().toISOString(); sauver(); toast('Sauvegarde créée'); S.rendre();
      };
      el.querySelector('#restaurer').onclick = async () => {
        const f = el.querySelector('#fichier').files[0]; if (!f) { toast('Choisis d\'abord le fichier'); return; }
        try {
          const e = await St.dechiffrer(await f.text(), el.querySelector('#mdp3').value);
          if (!confirm('Remplacer toutes les données de cet appareil par celles de la sauvegarde ?')) return;
          S.etat = e; await St.enregistrer(S.etat); appliquerAffichage(); toast('Données restaurées'); aller('#/planning');
        } catch (err) { toast(err.message, 4000); }
      };
      el.querySelector('#ics').onclick = () => {
        const t = exporterIcs(); if (!t) { toast('Aucune journée de travail à venir'); return; }
        telechargerFichier('mon-planning.ics', t, 'text/calendar');
      };
      const r = await St.protegerStockage();
      el.querySelector('#protege').innerHTML = r ? `${ic('bouclier')}<span>Stockage protégé : le navigateur ne videra pas tes données de lui-même.</span>` : `${ic('bouclierAlerte')}<span>Ce navigateur ne garantit pas la conservation des données : les sauvegardes sont d'autant plus importantes. Installer l'appli sur l'écran d'accueil aide.</span>`;
    }
  };
}

function exporterIcs() {
  const C = codes(); const today = M.aujourdhui(); const out = [];
  const fmt = (n) => { const d = M.depuisNum(Math.floor(n / 1440)); const m = n % 1440; return `${d.replace(/-/g, '')}T${M.pad(Math.floor(m / 60))}${M.pad(m % 60)}00`; };
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  for (let i = 0; i < 92; i++) {
    const d = M.ajouterJours(today, i); const j = M.journee(d, S.etat, C);
    for (const [a, b] of M.blocs(j)) out.push(['BEGIN:VEVENT', `UID:${d}-${a}@mon-temps`, `DTSTAMP:${stamp}`, `DTSTART:${fmt(a)}`, `DTEND:${fmt(b)}`, `SUMMARY:${j.code}${j.info && j.info.libelle ? ' — ' + j.info.libelle : ''}`, 'END:VEVENT'].join('\r\n'));
  }
  if (!out.length) return null;
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mon Temps//FR', 'CALSCALE:GREGORIAN', ...out, 'END:VCALENDAR'].join('\r\n');
}

// ---------- Relevé annuel imprimable ----------
export function vueReleve(p) {
  const y = /^\d{4}$/.test(p[1] || '') ? Number(p[1]) : Number(M.aujourdhui().slice(0, 4));
  const b = M.bilanAnnee(y, S.etat, S.cfg); const C = codes(); const pr = profil();
  const alertes = S.etat.reglages.controles ? M.controles(`${y}-01-01`, b.jusqua, S.etat, S.cfg) : [];
  let mois = '';
  for (let m = 1; m <= 12; m++) {
    const lignes = [];
    for (let d = 1; d <= M.joursDansMois(y, m); d++) {
      const date = M.iso(y, m, d); if (date > b.jusqua) break;
      const j = M.journee(date, S.etat, C); if (!j) continue;
      lignes.push(`<tr><td>${d} ${esc(M.JOURS[M.jourSemaine(date)].slice(0, 3))}.</td><td><b>${esc(j.code)}</b>${j.change ? ` <span class="petit">(prévu ${esc(j.prevuCode)})</span>` : ''}</td><td>${j.info && j.info.debut ? `${esc(j.info.debut)}–${esc(j.info.fin)}` : esc(j.info ? j.info.libelle : '')}</td><td>${j.effMin ? M.formatDuree(j.effMin) : ''}</td><td>${j.depassementMin ? M.formatDuree(j.depassementMin, true) : ''}</td><td>${esc(j.note)}${j.rappel ? ' · rappel sur repos' : ''}</td></tr>`);
    }
    if (!lignes.length) continue;
    const bm = b.mois[m - 1];
    mois += `<h2>${esc(M.MOIS[m - 1].replace(/^./, (c) => c.toUpperCase()))} ${y}${bm ? ` <span class="petit" style="font-weight:600">· fait ${M.formatDuree(bm.realise)} · dû ${M.formatDuree(bm.theorique)} · solde ${M.formatDuree(bm.solde, true)}</span>` : ''}</h2>
      <table><thead><tr><th>Jour</th><th>Code</th><th>Horaire</th><th>Compté</th><th>Dépass.</th><th>Note</th></tr></thead><tbody>${lignes.join('')}</tbody></table>`;
  }
  const ligne = (l, v) => `<tr><td>${l}</td><td style="text-align:right"><b>${v}</b></td></tr>`;
  return {
    html: `${enteteRetour(`Relevé ${y}`, `#/compteurs/${y}`)}
      <div class="page pas-imprimer" style="margin-top:.75rem"><button class="btn principal plein" id="imprimer">${ic('imprimer')}Imprimer ou enregistrer en PDF</button>
      <p class="petit" style="margin:0">Dans la fenêtre d'impression, choisis « Enregistrer en PDF » pour obtenir un fichier.</p></div>
      <article class="releve">
        <h1 style="font-size:1.75rem">Relevé de temps de travail ${y}</h1>
        <p class="texte" style="margin-top:.5rem">${esc([pr.prenom, pr.metier, pr.service].filter(Boolean).join(' · ') || 'Agent')} · ${esc(S.cfg.etablissement)} · quotité ${pr.quotite || 100} % · arrêté au ${esc(M.longue(b.jusqua))}</p>
        <table style="max-width:28rem">${ligne('Heures comptées', M.formatDuree(b.realise))}${ligne('Heures dues', M.formatDuree(b.theorique))}${b.report ? ligne(`Report ${y - 1}`, M.formatDuree(b.report, true)) : ''}${ligne('Solde', M.formatDuree(b.solde, true))}${ligne('Dépassements', M.formatDuree(b.depassements))}${ligne('Dimanches et fériés travaillés', `${b.djfJours} j · ${M.formatDuree(b.djfMinutes)}`)}${ligne('Heures de nuit', M.formatDuree(b.nuit))}${ligne('RTT posés', b.rttPris)}${ligne('Congés annuels posés', b.caPris)}${ligne('Jours saisis', `${b.saisis} / ${b.total}`)}${ligne('Alertes au décret 2002-9', alertes.length)}</table>
        ${alertes.length ? `<h2>Alertes</h2><table><tbody>${alertes.map((a) => `<tr><td style="white-space:nowrap">${esc(M.courte(a.date))}</td><td><b>${esc(a.regle)}</b> — ${esc(a.message)}</td></tr>`).join('')}</tbody></table>` : ''}
        ${mois || '<p class="vide-etat">Aucune journée saisie sur cette année.</p>'}
        <div class="signatures"><div>Signature de l'agent</div><div>Visa de l'encadrement</div></div>
        <p class="petit" style="margin-top:1rem">Relevé établi par l'agent à partir de ses propres saisies dans ${esc(S.cfg.nom)}. Document indicatif, à rapprocher du relevé officiel de l'établissement.</p>
      </article>`,
    apres(el) { el.querySelector('#imprimer').onclick = () => window.print(); }
  };
}

// ---------- Bienvenue ----------
export function vueBienvenue() {
  S.vue.bv = S.vue.bv || { etape: 1, prenom: '', metier: '', quotite: 100 };
  const B = S.vue.bv;
  const enTete = `<div style="padding:calc(2.5rem + env(safe-area-inset-top)) 1rem 0;display:flex;flex-direction:column;gap:1rem"><div class="marque">${marque(S.cfg)}<span>${esc(S.cfg.syndicat)}</span></div>`;
  if (B.etape === 1) return {
    html: `${enTete}<h1 style="font-size:3rem">${esc(S.cfg.nom)}</h1><p class="texte" style="font-size:1.0625rem">${esc(S.cfg.slogan || '')}</p></div>
      <div class="page" style="margin-top:1.5rem">
        <ul class="liste">
          <li><div class="ligne" style="align-items:flex-start">${ic('calendrier')}<span style="flex:1"><b>Ton planning, réellement fait</b><span class="sous">Les heures en plus, les rappels, les changements.</span></span></div></li>
          <li><div class="ligne" style="align-items:flex-start">${ic('barres')}<span style="flex:1"><b>Tes compteurs à jour</b><span class="sous">Solde d'heures, RTT, congés, dimanches et fériés.</span></span></div></li>
          <li><div class="ligne" style="align-items:flex-start">${ic('cadenas')}<span style="flex:1"><b>Rien ne sort de ton téléphone</b><span class="sous">Pas de compte, pas de serveur, aucune collecte.</span></span></div></li>
        </ul>
        <button class="btn principal plein" id="suivant">Commencer</button>
        <div class="rangee"><a class="btn" href="#/recevoir">${ic('qr')}Je change de téléphone</a><a class="btn" href="#/sauvegarde">J'ai une sauvegarde</a></div>
      </div>`,
    apres(el) { el.querySelector('#suivant').onclick = () => { B.etape = 2; S.rendre(); }; }
  };
  if (B.etape === 2) return {
    html: `${enTete}<p class="etiquette">Étape 1 sur 3</p><h1>Ton poste</h1><p class="texte">Pour calculer ce que tu dois. Tout reste modifiable dans les réglages.</p></div>
      <div class="page" style="margin-top:1rem">
        <label class="champ"><span>Prénom (facultatif)</span><input id="prenom" value="${esc(B.prenom)}" autocomplete="given-name"></label>
        <label class="champ"><span>Métier</span><select id="metier"><option value="">Choisir…</option>${S.cfg.metiers.map((m) => `<option ${B.metier === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></label>
        <label class="champ"><span>Temps de travail</span><select id="quotite">${[100, 90, 80, 70, 60, 50].map((q) => `<option value="${q}" ${B.quotite === q ? 'selected' : ''}>${q === 100 ? 'Temps plein (100 %)' : `Temps partiel ${q} %`}</option>`).join('')}</select></label>
        <button class="btn principal plein" id="suivant">Continuer</button>
      </div>`,
    apres(el) {
      el.querySelector('#suivant').onclick = () => {
        B.prenom = el.querySelector('#prenom').value.trim(); B.metier = el.querySelector('#metier').value; B.quotite = Number(el.querySelector('#quotite').value);
        S.etat.profil = { prenom: B.prenom, metier: B.metier, quotite: B.quotite, service: '' }; sauver(); B.etape = 'depart'; S.rendre();
      };
    }
  };
  if (B.etape === 'depart') {
    const y = Number(M.aujourdhui().slice(0, 4));
    return {
      html: `${enTete}<p class="etiquette">Étape 2 sur 3</p><h1>Et depuis janvier ?</h1><p class="texte">Tu installes l'appli en cours d'année : ton solde d'heures, tes RTT et tes congés ont déjà bougé. Pour des compteurs justes, l'appli doit partir du bon point.</p></div>
        <div class="page" style="margin-top:1.25rem">
          <button class="btn principal plein" id="releve">Je recopie mon dernier relevé (2 min)</button>
          <button class="btn plein" id="zero">Je commence aujourd'hui, sans historique</button>
          <button class="btn plein" id="janvier">Je saisirai tout depuis le 1ᵉʳ janvier</button>
          <p class="petit" style="margin:0">Le relevé, c'est ton compteur d'heures sur Octime ou sur papier. Tu pourras le recopier plus tard dans Compteurs › Point de départ.</p>
        </div>`,
      apres(el) {
        el.querySelector('#releve').onclick = () => { S.vue.depuisAccueil = true; aller(`#/report/${y}`); };
        el.querySelector('#zero').onclick = () => { S.etat.departs[y] = { date: M.aujourdhui(), soldeMin: 0 }; sauver(); B.etape = 3; S.rendre(); };
        el.querySelector('#janvier').onclick = () => { B.etape = 3; S.rendre(); };
      }
    };
  }
  return {
    html: `${enTete}<p class="etiquette">Étape 3 sur 3</p><h1>On fait un tour ?</h1><p class="texte">En deux minutes, avec un faux planning : tu touches, tu essaies, rien n'est enregistré. Ensuite, ton vrai planning t'attend.</p></div>
      <div class="page" style="margin-top:1.5rem">
        <button class="btn principal plein" id="essai">Faire la visite guidée</button>
        <button class="btn plein" id="direct">Commencer directement</button>
        <p class="petit" style="margin:0">Tu pourras relancer la visite à tout moment depuis les réglages.</p>
      </div>`,
    apres(el) {
      el.querySelector('#essai').onclick = () => { S.vue.bv = null; Visite.demarrerEssai(); };
      el.querySelector('#direct').onclick = () => { S.vue.bv = null; aller('#/planning'); };
    }
  };
}

// ---------- Confidentialité ----------
export function vueConfidentialite() {
  const c = S.cfg;
  return {
    html: `${enteteRetour('Confidentialité', '#/reglages')}
      <div class="page" style="margin-top:.75rem">
        <div class="carte"><h2>Ce que l'appli sait de toi</h2><p class="texte" style="margin-top:.375rem">Ce que tu saisis : ton planning, tes notes, ton métier. Tout est enregistré uniquement dans ce téléphone (ou cet ordinateur).</p></div>
        <div class="carte"><h2>Ce qui est envoyé</h2><p class="texte" style="margin-top:.375rem">Rien. L'appli n'a ni compte, ni serveur, ni statistiques de visite, ni publicité, ni cookies. Le syndicat ne voit pas ton planning.${c.statistiques && c.statistiques.goatcounter ? ' Une seule exception : pour savoir combien d\'appareils utilisent l\'appli, un simple signal « première ouverture » et « appli installée » est envoyé une seule fois, sans aucune information sur toi, ton planning ou ton appareil.' : ''}</p></div>
        <div class="carte"><h2>Quand tu envoies un mail</h2><p class="texte" style="margin-top:.375rem">Les mails (grève, signalement, courriers) sont seulement préparés : ils s'ouvrent dans ta propre messagerie, et c'est toi qui décides de les envoyer.</p></div>
        <div class="carte"><h2>Tes sauvegardes</h2><p class="texte" style="margin-top:.375rem">Elles sont chiffrées avec ton mot de passe (AES-256). Sans lui, le fichier est illisible, y compris pour nous.</p></div>
        <div class="carte"><h2>Effacer</h2><p class="texte" style="margin-top:.375rem">Réglages › Effacer toutes mes données supprime tout de cet appareil, immédiatement.</p></div>
        <p class="petit">Site hébergé par GitHub Pages, qui enregistre comme tout hébergeur l'adresse IP des visites pour la sécurité. ${c.responsablePublication ? `Responsable de la publication : ${esc(c.responsablePublication)}. ` : ''}${c.adressePostale ? esc(c.adressePostale) + '. ' : ''}Code source ouvert, consultable par tous.</p>
      </div>`
  };
}
