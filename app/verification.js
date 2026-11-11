// Mon Temps — page « Vérifier les chiffres » : tout ce que l'appli utilise, avec sa source et son statut.
import * as M from './moteur.js';
import { S } from './etat.js';
import { esc, ic, enteteRetour, mailto, aValider } from './commun.js';

const D2002_9 = 'Décret n° 2002-9, art. 6 et 7';
const LOCAL = 'Protocole du centre hospitalier (à renseigner)';
const n = (v, u = '') => `${String(v).replace('.', ',')}${u ? ' ' + u : ''}`;
const eur = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v);

// [clé de validation, libellé, valeur, source, explication]
function sections() {
  const R = S.cfg.regles; const B = S.cfg.baremes.actuels; const c = S.cfg.contacts || {};
  const datee = (l) => l ? ` (depuis le ${M.longue(l.date)})` : '';
  return [
    { titre: 'Temps de travail et repos', aide: 'Règles légales utilisées pour les alertes.', lignes: [
      ['regles.reposQuotidienMinHeures', 'Repos entre deux journées', n(R.reposQuotidienMinHeures, 'h'), D2002_9],
      ['regles.reposHebdoMinHeures', 'Repos hebdomadaire', n(R.reposHebdoMinHeures, 'h'), D2002_9],
      ['regles.maxSeptJoursHeures', 'Maximum sur 7 jours', n(R.maxSeptJoursHeures, 'h'), D2002_9],
      ['regles.reposQuinzaineMinJours', 'Jours de repos par quinzaine', n(R.reposQuinzaineMinJours, 'jours'), D2002_9],
      ['regles.amplitudeMaxHeures', 'Amplitude maximale d\'une journée', n(R.amplitudeMaxHeures, 'h'), D2002_9],
      ['regles.dureeContinueMaxJourHeures', 'Durée continue maximale, équipe de jour', n(R.dureeContinueMaxJourHeures, 'h'), D2002_9],
      ['regles.dureeContinueMaxNuitHeures', 'Durée continue maximale, équipe de nuit', n(R.dureeContinueMaxNuitHeures, 'h'), D2002_9],
      ['regles.amplitudeServiceCoupeHeures', 'Amplitude maximale d\'un service coupé', n(R.amplitudeServiceCoupeHeures, 'h'), D2002_9],
      ['regles.vacationMinHeures', 'Durée minimale d\'une vacation', n(R.vacationMinHeures, 'h'), D2002_9],
      ['regles.delaiPrevenanceHeures', 'Délai de prévenance d\'un changement de planning', n(R.delaiPrevenanceHeures, 'h'), LOCAL],
      ['regles.nuitDebut', 'Heures de nuit', `${R.nuitDebut} – ${R.nuitFin}`, 'Réglementation des heures de nuit']
    ] },
    { titre: 'Jours et congés', aide: 'Droits annuels à temps plein (ajustés à la quotité de l\'agent).', lignes: [
      ['regles.valeurJourneeHeures', 'Valeur d\'une journée', n(R.valeurJourneeHeures, 'h'), LOCAL],
      ['regles.rttParAn', 'RTT par an', n(R.rttParAn, 'jours'), LOCAL],
      ['regles.caParAn', 'Congés annuels par an', n(R.caParAn, 'jours'), 'Décret n° 2002-8'],
      ['regles.rhParAn', 'Repos hebdomadaires attendus par an', n(R.rhParAn, 'jours'), LOCAL],
      ['regles.gardeEnfantJours', 'Garde d\'enfant malade (GE) par an', n(R.gardeEnfantJours, 'jours'), 'Autorisations spéciales d\'absence, à confirmer au niveau local'],
      ['regles.periodeEstivale', 'Période estivale (congés hors saison)', `${R.periodeEstivale.debut} → ${R.periodeEstivale.fin}`, 'Décret n° 2002-8']
    ] },
    { titre: 'Salaire et indemnités', aide: 'Servent aux estimations d\'Outils › Mon salaire et aux calculateurs.', lignes: [
      ['baremes.point', 'Valeur du point d\'indice (mensuelle)' + datee(B.pt), n(R.valeurPointMensuel, '€'), (B.pt && B.pt.source) || 'À renseigner'],
      ['baremes.indiceMin', 'Indice minimum de traitement' + datee(B.im), n(R.indiceMinimum), (B.im && B.im.source) || 'À renseigner'],
      ['baremes.smic', 'SMIC mensuel brut, 35 h' + datee(B.sm), `${eur(R.smicMensuel)} (${n(R.smicHoraire, '€')} / h)`, (B.sm && B.sm.source) || 'À renseigner'],
      ['regles.heuresAnnuellesTauxHoraire', 'Heures annuelles pour le taux horaire', n(R.heuresAnnuellesTauxHoraire, 'h'), 'Calcul du taux horaire des agents publics'],
      ['regles.majorationNuitPct', 'Majoration des heures de nuit', n(R.majorationNuitPct, '%'), 'À renseigner (texte officiel)'],
      ['regles.indemniteDimancheFerie8h', 'Indemnité dimanche et férié pour 8 h', eur(R.indemniteDimancheFerie8h), 'À renseigner (texte officiel)'],
      ['regles.coefHeuresSup1', 'Heures supplémentaires : coefficient', `${n(R.coefHeuresSup1)} puis ${n(R.coefHeuresSup2)} après ${R.seuilHeuresSup} h`, 'À renseigner (texte officiel)'],
      ['regles.maladieTauxPct', 'Arrêt maladie : traitement versé', `${n(R.maladieTauxPct, '%')} pendant ${R.maladieJoursTauxPlein} jours, puis 50 %`, 'À renseigner (texte officiel)'],
      ['paie', 'Date de paie', (S.cfg.paie && S.cfg.paie.actif !== false) ? `dernier jour ouvré − ${S.cfg.paie.decalageJours ?? 2} jours${(S.cfg.paie.exceptions || []).length ? ' · ' + S.cfg.paie.exceptions.map((x) => `${x.mois} : ${x.date}`).join(', ') : ''}` : 'Non affichée', 'Calendrier de paie de la fonction publique, à confirmer avec le service de paie du centre hospitalier'],
      ...S.cfg.primes.map((x) => ['primes.' + x.id, 'Prime : ' + x.nom, x.mode === 'points' ? `${x.valeur} points d'indice` : x.mode === 'pourcentage' ? `${String(x.valeur).replace('.', ',')} % du traitement` : x.mode === 'montant' ? eur(x.valeur) : 'saisie par l\'agent', x.source || 'À renseigner']),
      ['baremes.grilles', 'Grilles indiciaires (grades et échelons)', S.cfg.grilles.length ? `${S.cfg.grilles.length} grade${S.cfg.grilles.length > 1 ? 's' : ''} saisi${S.cfg.grilles.length > 1 ? 's' : ''}` : 'Aucune saisie : l\'agent tape son indice', 'Baremes › Grilles indiciaires']
    ] },
    { titre: 'Horaires', aide: 'Un code par horaire du planning. Les pauses non comptées sont à confirmer.', lignes: S.cfg.codes.filter((x) => x.debut).map((x) => ['codes.pause', `${x.code} — ${x.libelle || ''}`, `${x.debut} – ${x.fin}${x.debut2 ? ` + ${x.debut2} – ${x.fin2}` : ''} · pause ${x.pauseMin || 0} min · ${M.formatDuree(M.dureeEffectiveCode(x))} comptées`, LOCAL]) },
    { titre: 'Contacts du syndicat', aide: 'Affichés dans l\'appli, onglet Syndicat et bouton téléphone.', lignes: [
      ['contacts', 'Téléphone', c.telephone || '—', ''], ['contacts', 'Mail général', c.mailGeneral || '—', ''], ['contacts', 'Mail des signalements', c.mailSignalement || '—', ''], ['contacts', 'Local et permanences', [c.local, c.permanences].filter(Boolean).join(' · ') || '—', '']
    ] }
  ];
}

export function vueVerification() {
  const secs = sections();
  const tout = secs.flatMap((s) => s.lignes);
  const aFaire = tout.filter((l) => aValider(S.cfg, l[0])).length;
  const texte = [`Vérification des chiffres — ${S.cfg.nom}`, '', ...secs.flatMap((s) => [s.titre.toUpperCase(), ...s.lignes.map((l) => `- ${l[1]} : ${l[2]}${aValider(S.cfg, l[0]) ? ' [À VALIDER]' : ''}`), ''])].join('\n');
  return {
    html: `${enteteRetour('Vérifier les chiffres', '#/reglages')}
      <div class="page" style="margin-top:.75rem">
        <section class="carte " style="display:flex;flex-direction:column;gap:.375rem">
          <h2>${aFaire ? `${aFaire} valeur${aFaire > 1 ? 's' : ''} à valider` : 'Toutes les valeurs sont validées'}</h2>
          <p class="texte">Voici tous les chiffres que l'appli utilise. Compare-les au protocole du centre hospitalier et aux textes officiels. Une valeur marquée <span class="provisoire">provisoire</span> est encore à confirmer.</p>
        </section>
        <div class="carte" style="display:flex;flex-direction:column;gap:.5rem"><b>Comment corriger</b>
          <p class="texte" style="margin:0">Ouvre le formulaire d'édition (app.pagescms.org), onglet <b>Règles de calcul</b>, <b>Barèmes</b>, <b>Codes horaires</b> ou <b>Appli, logo, contacts</b>. Change le chiffre, enregistre : l'appli se met à jour d'elle-même en quelques minutes. Pour retirer le badge « provisoire », supprime la ligne correspondante dans « Valeurs encore provisoires ».</p></div>
        ${secs.map((s) => `<section><p class="etiquette">${esc(s.titre)}</p><p class="petit" style="margin:0 0 .5rem">${esc(s.aide)}</p>
          <ul class="liste">${s.lignes.map((l) => `<li><div class="ligne" style="align-items:flex-start;gap:.75rem"><span style="flex:1"><b>${esc(l[1])}</b>${l[3] ? `<span class="sous">Source : ${esc(l[3])}</span>` : ''}</span><span style="text-align:right"><b>${esc(l[2])}</b><br>${aValider(S.cfg, l[0]) ? '<span class="provisoire">à valider</span>' : '<span class="badge vert">validé</span>'}</span></div></li>`).join('')}</ul></section>`).join('')}
        <div class="rangee pas-imprimer"><button class="btn" id="imprimer">${ic('imprimer')}Imprimer</button><a class="btn" href="${esc(mailto((S.cfg.contacts || {}).mailGeneral, `Vérification des chiffres — ${S.cfg.nom}`, texte))}">${ic('mail')}Envoyer cette liste</a></div>
      </div>`,
    apres(el) { el.querySelector('#imprimer').onclick = () => window.print(); }
  };
}
