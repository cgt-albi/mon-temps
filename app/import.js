// Écran Octime : « Remplir mon planning » (import) ou « Vérifier mon relevé » (comparaison + courrier).
import * as M from './moteur.js';
import * as O from './octime.js';
import { S, sauver, aller } from './etat.js';
import { esc, ic, toast, enteteRetour } from './commun.js';

let mode = 'remplir';  // ou 'verifier'
let apercu = null;     // import préparé, en attente de validation
let verif = null;      // résultat de la vérification

export function vueImport(p) {
  if (p && (p[1] === 'verifier' || p[1] === 'remplir') && p[1] !== mode) { mode = p[1]; apercu = null; verif = null; }
  const remplir = mode === 'remplir';
  return {
    html: `${enteteRetour('Mon relevé Octime', '#/outils')}
      <div class="page" style="margin-top:.75rem">
        <div class="segment" role="group" aria-label="Ce que je veux faire">
          <button type="button" data-mode="remplir" aria-pressed="${remplir}">Remplir mon planning</button>
          <button type="button" data-mode="verifier" aria-pressed="${!remplir}">Vérifier mon relevé</button></div>
        <p class="texte" style="margin:0">${remplir
    ? 'Remplis ton planning d\'un coup, même sur plusieurs mois, à partir de ton <b>emploi du temps individuel</b> exporté d\'Octime en PDF. Les journées passées arrivent avec tes heures réelles.'
    : 'Compare ce qu\'Octime a enregistré avec ce que tu as noté dans l\'appli : dépassement oublié, réunion non comptée, horaire changé. L\'appli prépare le courrier pour demander la régularisation.'}</p>
        <details class="carte"><summary style="font-weight:700;cursor:pointer">Comment faire</summary>
          <ol class="texte" style="margin:.5rem 0 0;padding-left:1.25rem;display:flex;flex-direction:column;gap:.375rem">
            <li>Dans Octime, affiche ton <b>emploi du temps individuel</b> sur la période voulue et enregistre-le en <b>PDF</b>. Si tu n'y as pas accès, demande-le à ton cadre.</li>
            <li>Ici, touche <b>Choisir le PDF</b> et prends ce fichier.</li>
            <li>${remplir ? 'Vérifie l\'aperçu, puis touche <b>Ajouter à mon planning</b>.' : 'Regarde les écarts trouvés, puis prépare le courrier si besoin.'}</li>
          </ol></details>
        <p class="petit" style="margin:0;display:flex;gap:.5rem">${ic('bouclier')}<span>Lu sur ton téléphone, envoyé nulle part, sans IA. Ton nom et ton matricule ne sont pas enregistrés.</span></p>
        <label class="btn principal" style="cursor:pointer">${ic('telecharger')}Choisir le PDF<input type="file" id="pdf" accept="application/pdf,.pdf" hidden></label>
        <p class="petit" id="etat-import" role="status" style="margin:0"></p>
        ${remplir ? blocApercu() : blocVerif()}
      </div>`,
    apres(el) {
      const info = el.querySelector('#etat-import');
      el.querySelectorAll('[data-mode]').forEach((b) => b.onclick = () => aller('#/import/' + b.dataset.mode));
      el.querySelector('#pdf').onchange = async (e) => {
        const f = e.target.files[0]; if (!f) return;
        info.textContent = 'Lecture du relevé…';
        try {
          const a = O.analyserLignes(await O.lignesDuPdf(f));
          if (!a.estOctime || !Object.keys(a.jours).length) { apercu = verif = null; info.textContent = 'Ce PDF ne ressemble pas à un emploi du temps individuel Octime. Vérifie que tu as bien exporté ce document-là.'; return; }
          if (remplir) apercu = O.preparerImport(a, S.etat, S.cfg);
          else verif = O.comparer(a, S.etat, S.cfg);
          S.rendre();
        } catch (err) {
          apercu = verif = null; info.textContent = 'Impossible de lire ce PDF. S\'il est protégé ou scanné, exporte-le à nouveau depuis Octime.';
        }
      };
      const v = el.querySelector('#valider');
      if (v) v.onclick = () => {
        if (S.demo) { toast('Impossible en mode essai'); return; }
        if (apercu.remplaces && !confirm(`${apercu.remplaces} jour(s) déjà noté(s) seront remplacés par le relevé Octime. Continuer ?`)) return;
        O.appliquerImport(S.etat, apercu);
        const n = apercu.nombre; apercu = null;
        sauver(); toast(`${n} jours ajoutés à ton planning`); aller('#/planning');
      };
      const a = el.querySelector('#annuler');
      if (a) a.onclick = () => { apercu = verif = null; S.rendre(); };
      const cp = el.querySelector('#copier');
      if (cp) cp.onclick = async () => { const t = el.querySelector('#courrier'); try { await navigator.clipboard.writeText(t.value); toast('Courrier copié'); } catch (e) { t.select(); toast('Sélectionné : copie-le avec ton clavier'); } };
    }
  };
}

function blocApercu() {
  const p = apercu; if (!p) return '';
  return `<section class="carte" style="display:flex;flex-direction:column;gap:.5rem">
    <h2>Aperçu</h2>
    <p class="texte" style="margin:0"><b>${p.nombre} jours</b> trouvés, du ${esc(M.longue(p.debut))} au ${esc(M.longue(p.fin))}.</p>
    <ul class="petit" style="margin:0;padding-left:1.1rem">
      <li>${p.ecarts} journée${p.ecarts > 1 ? 's' : ''} passée${p.ecarts > 1 ? 's' : ''} avec des heures différentes de l'horaire habituel (l'écart est noté).</li>
      ${p.remplaces ? `<li><b>${p.remplaces} jour${p.remplaces > 1 ? 's' : ''} déjà noté${p.remplaces > 1 ? 's' : ''}</b> sur cette période ${p.remplaces > 1 ? 'seront remplacés' : 'sera remplacé'} par le relevé (tes temps en plus sont gardés).</li>` : ''}
      ${p.nouveauxCodes.length ? `<li>Ajouté${p.nouveauxCodes.length > 1 ? 's' : ''} à tes codes perso : ${p.nouveauxCodes.map((c) => esc(c.code)).join(', ')}.</li>` : ''}
      ${p.ignores.length ? `<li>Code${p.ignores.length > 1 ? 's' : ''} inconnu${p.ignores.length > 1 ? 's' : ''}, jours laissés vides : ${p.ignores.map(esc).join(', ')}. Signale-le au syndicat.</li>` : ''}
    </ul>
    <button class="btn principal" id="valider">${ic('plus')}Ajouter à mon planning</button>
    <button class="btn" id="annuler">Annuler</button>
  </section>`;
}

function blocVerif() {
  const r = verif; if (!r) return '';
  if (!r.compares) return '<div class="carte"><p class="texte" style="margin:0">Aucun jour de ce relevé n\'est noté dans ton planning : il n\'y a rien à comparer. Pour remplir ton planning à partir de ce relevé, choisis « Remplir mon planning ».</p></div>';
  const h = (m) => M.formatDuree(m);
  const ligne = (e) => `<li style="padding:.625rem .75rem;display:flex;flex-direction:column;gap:2px">
      <span style="display:flex;justify-content:space-between;gap:.5rem"><b>${esc(M.courte(e.date))}</b>${e.diff > 0 ? `<b style="color:var(--rouge-texte)">${M.formatDuree(e.diff, true)}</b>` : '<span class="petit">code différent</span>'}</span>
      <span class="petit">Octime : ${esc(e.octime.code)}${e.octime.horaire ? ' ' + esc(e.octime.horaire) : ''} (${h(e.octime.minutes)}) · Toi : ${esc(e.agent.code)} (${h(e.agent.minutes)})${e.agent.ajouts.length ? ' dont ' + esc(e.agent.ajouts.map((a) => `${a.motif} ${a.debut}–${a.fin}`).join(', ')) : ''}</span></li>`;
  const prenom = (S.etat.profil && S.etat.profil.prenom) || '';
  const formule = (S.cfg.courriers && S.cfg.courriers.formule) || '';
  return `<section class="carte" style="display:flex;flex-direction:column;gap:.5rem">
    <h2>${r.aReclamer.length ? `${M.formatDuree(r.totalMin)} non comptées` : 'Tout correspond'}</h2>
    <p class="petit" style="margin:0">${r.compares} jour${r.compares > 1 ? 's' : ''} comparé${r.compares > 1 ? 's' : ''}. ${r.aReclamer.length ? `Octime compte moins que toi sur ${r.aReclamer.length} jour${r.aReclamer.length > 1 ? 's' : ''}.` : 'Octime compte au moins autant d\'heures que toi sur chaque jour.'}${r.ecarts.length > r.aReclamer.length ? ` ${r.ecarts.length - r.aReclamer.length} jour(s) ont un code différent, à regarder.` : ''}</p>
    ${r.ecarts.length ? `<ul class="liste">${r.ecarts.slice(0, 60).map(ligne).join('')}</ul>` : ''}
  </section>
  ${r.aReclamer.length ? `<details class="carte"><summary style="font-weight:700;cursor:pointer">Préparer le courrier de réclamation</summary>
    <textarea id="courrier" rows="12" style="width:100%;margin-top:.5rem">${esc(O.courrierReclamation(r, { prenom, formule }))}</textarea>
    <div class="rangee" style="margin-top:.5rem"><button class="btn" id="copier">${ic('copier')}Copier</button><a class="btn" href="mailto:?subject=${encodeURIComponent('Demande de régularisation de mon relevé d\'heures')}&body=${encodeURIComponent(O.courrierReclamation(r, { prenom, formule }))}">${ic('mail')}Envoyer par mail</a></div>
  </details>` : ''}
  <button class="btn" id="annuler">Fermer</button>`;
}
