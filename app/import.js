// Écran « Importer mon emploi du temps Octime » : explication, choix du PDF, aperçu, validation.
import * as M from './moteur.js';
import * as O from './octime.js';
import { S, sauver, aller } from './etat.js';
import { esc, ic, toast, enteteRetour } from './commun.js';

let apercu = null; // résultat préparé, en attente de validation

export function vueImport() {
  const p = apercu;
  return {
    html: `${enteteRetour('Importer depuis Octime', '#/outils')}
      <div class="page" style="margin-top:.75rem">
        <p class="texte">Remplis ton planning d'un coup, même sur plusieurs mois, à partir de ton <b>emploi du temps individuel</b> exporté d'Octime en PDF. Les journées passées arrivent avec tes heures réelles.</p>
        <section class="carte" style="display:flex;flex-direction:column;gap:.5rem">
          <h2>Comment faire</h2>
          <ol class="texte" style="margin:0;padding-left:1.25rem;display:flex;flex-direction:column;gap:.375rem">
            <li>Dans Octime, affiche ton <b>emploi du temps individuel</b> sur la période voulue (par exemple depuis janvier) et enregistre-le en <b>PDF</b>. Si tu n'y as pas accès, demande-le à ton cadre.</li>
            <li>Ici, touche <b>Choisir le PDF</b> et prends ce fichier.</li>
            <li>Vérifie l'aperçu, puis touche <b>Ajouter à mon planning</b>.</li>
          </ol>
        </section>
        <div class="carte" style="display:flex;gap:.625rem">${ic('bouclier')}<span class="petit" style="margin:0">Le fichier est lu <b>sur ton téléphone</b> : il n'est envoyé nulle part, ni au syndicat, ni à un serveur. Aucune intelligence artificielle : l'appli lit le relevé ligne par ligne. Elle garde seulement les dates, les codes et les horaires ; ton nom et ton matricule ne sont pas enregistrés.</span></div>
        <label class="btn principal" style="cursor:pointer">${ic('telecharger')}Choisir le PDF<input type="file" id="pdf" accept="application/pdf,.pdf" hidden></label>
        <p class="petit" id="etat-import" role="status" style="margin:0"></p>
        ${p ? `<section class="carte" style="display:flex;flex-direction:column;gap:.5rem">
          <h2>Aperçu</h2>
          <p class="texte" style="margin:0"><b>${p.nombre} jours</b> trouvés, du ${esc(M.longue(p.debut))} au ${esc(M.longue(p.fin))}.</p>
          <ul class="petit" style="margin:0;padding-left:1.1rem">
            <li>${p.ecarts} journée${p.ecarts > 1 ? 's' : ''} passée${p.ecarts > 1 ? 's' : ''} avec des heures différentes de l'horaire habituel (l'écart est noté).</li>
            ${p.remplaces ? `<li><b>${p.remplaces} jour${p.remplaces > 1 ? 's' : ''} déjà noté${p.remplaces > 1 ? 's' : ''}</b> sur cette période ${p.remplaces > 1 ? 'seront remplacés' : 'sera remplacé'} par le relevé.</li>` : ''}
            ${p.nouveauxCodes.length ? `<li>Code${p.nouveauxCodes.length > 1 ? 's' : ''} ajouté${p.nouveauxCodes.length > 1 ? 's' : ''} à tes codes perso : ${p.nouveauxCodes.map((c) => esc(c.code)).join(', ')}.</li>` : ''}
            ${p.ignores.length ? `<li>Code${p.ignores.length > 1 ? 's' : ''} inconnu${p.ignores.length > 1 ? 's' : ''}, jours laissés vides : ${p.ignores.map(esc).join(', ')}. Signale-le au syndicat.</li>` : ''}
          </ul>
          <button class="btn principal" id="valider">${ic('plus')}Ajouter à mon planning</button>
          <button class="btn" id="annuler">Annuler</button>
        </section>` : ''}
      </div>`,
    apres(el) {
      const info = el.querySelector('#etat-import');
      el.querySelector('#pdf').onchange = async (e) => {
        const f = e.target.files[0]; if (!f) return;
        info.textContent = 'Lecture du relevé…';
        try {
          const lignes = await O.lignesDuPdf(f);
          const a = O.analyserLignes(lignes);
          if (!a.estOctime || !Object.keys(a.jours).length) { apercu = null; info.textContent = "Ce PDF ne ressemble pas à un emploi du temps individuel Octime. Vérifie que tu as bien exporté ce document-là."; return; }
          apercu = O.preparerImport(a, S.etat, S.cfg);
          S.rendre();
        } catch (err) {
          apercu = null; info.textContent = "Impossible de lire ce PDF. S'il est protégé ou scanné, exporte-le à nouveau depuis Octime.";
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
      if (a) a.onclick = () => { apercu = null; S.rendre(); };
    }
  };
}
