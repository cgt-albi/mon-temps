// Transfert d'un téléphone à l'autre par QR code animé, sans serveur ni réseau.
// Les données sont compressées puis chiffrées (AES-256) avec un code à usage unique
// affiché sur l'écran d'envoi : sans ce code, les QR codes filmés ne servent à rien.
import qrcode from './vendor/qrcode.mjs';
import * as St from './stockage.js';
import { S, sauver, aller, appliquerAffichage } from './etat.js';
import { esc, ic, toast, enteteRetour } from './commun.js';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const TAILLE_MORCEAU = 360;
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = (a) => { let s = ''; for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function codeAleatoire() { const v = crypto.getRandomValues(new Uint8Array(8)); return [...v].map((x) => ALPHABET[x % ALPHABET.length]).join(''); }
const formatCode = (c) => `${c.slice(0, 4)}-${c.slice(4)}`;
const nettoyerCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

async function cle(code, sel) {
  const base = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sel, iterations: 120000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function flux(octets, transfo) { return new Uint8Array(await new Response(new Blob([octets]).stream().pipeThrough(transfo)).arrayBuffer()); }

async function emballer(etat, code) {
  let octets = enc.encode(JSON.stringify(etat)); let z = 0;
  if ('CompressionStream' in self) { octets = await flux(octets, new CompressionStream('gzip')); z = 1; }
  const sel = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const chiffre = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await cle(code, sel), octets));
  const tout = new Uint8Array(2 + 16 + 12 + chiffre.length);
  tout[0] = 1; tout[1] = z; tout.set(sel, 2); tout.set(iv, 18); tout.set(chiffre, 30);
  return b64(tout);
}
async function deballer(texte, code) {
  const t = unb64(texte);
  if (t[0] !== 1) throw new Error('Version de transfert inconnue');
  let clair;
  try { clair = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: t.slice(18, 30) }, await cle(code, t.slice(2, 18)), t.slice(30))); }
  catch (e) { throw new Error('Code incorrect.'); }
  if (t[1] === 1) {
    if (!('DecompressionStream' in self)) throw new Error('Ce navigateur est trop ancien pour recevoir le transfert. Utilise plutôt le fichier de sauvegarde.');
    clair = await flux(clair, new DecompressionStream('gzip'));
  }
  return St.normaliser(JSON.parse(dec.decode(clair)));
}

function dessinerQR(canvas, texte) {
  const q = qrcode(0, 'L'); q.addData(texte, 'Byte'); q.make();
  const n = q.getModuleCount(), marge = 4, total = n + marge * 2;
  const px = Math.floor(Math.min(canvas.width, canvas.height) / total), dec0 = Math.floor((canvas.width - px * total) / 2);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#000';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect(dec0 + (c + marge) * px, dec0 + (r + marge) * px, px, px);
}

// ---------- Envoyer ----------
let minuteurEnvoi = null;
export function vueTransfert() {
  if (S.demo) return { html: `${enteteRetour('Transférer', '#/sauvegarde')}<div class="page" style="margin-top:.75rem"><div class="carte ambre"><b>Mode essai</b><p class="petit" style="margin:.25rem 0 0">Le transfert est désactivé pendant l'essai.</p></div></div>` };
  const T = S.vue.envoi;
  return {
    html: `${enteteRetour('Envoyer', '#/sauvegarde')}
      <div class="page" style="margin-top:.75rem">
        <ol class="etapes-simples">
          <li>Sur le nouveau téléphone, ouvre l'appli puis <b>Sauvegarde › Recevoir</b>.</li>
          <li>Vise ce code avec l'autre téléphone, à 20 cm environ, jusqu'à 100 %.</li>
          <li>Tape ensuite le code ci-dessous sur l'autre téléphone.</li>
        </ol>
        <div class="carte" style="display:flex;flex-direction:column;align-items:center;gap:.75rem">
          <canvas id="qr" width="640" height="640" style="width:min(100%,20rem);aspect-ratio:1;image-rendering:pixelated" role="img" aria-label="Code QR animé du transfert"></canvas>
          <p class="petit" id="compte" style="margin:0" aria-live="off">Préparation…</p>
        </div>
        <div class="carte sombre" style="text-align:center"><p class="etiquette">Code à taper sur l'autre téléphone</p><p id="code" style="margin:.375rem 0 0;font-size:2rem;font-weight:800;letter-spacing:.08em;font-stretch:90%">${T ? esc(formatCode(T.code)) : '····-····'}</p></div>
        <p class="petit" style="margin:0">Garde cet écran allumé pendant le transfert. Personne d'autre que toi ne doit voir le code.</p>
      </div>`,
    async apres(el) {
      clearInterval(minuteurEnvoi);
      if (!S.vue.envoi) {
        const code = codeAleatoire();
        const texte = await emballer(S.etat, code);
        const sid = codeAleatoire().slice(0, 4);
        const n = Math.ceil(texte.length / TAILLE_MORCEAU);
        const morceaux = Array.from({ length: n }, (_, i) => `MT1|${sid}|${i + 1}|${n}|${texte.slice(i * TAILLE_MORCEAU, (i + 1) * TAILLE_MORCEAU)}`);
        S.vue.envoi = { code, morceaux };
        el.querySelector('#code').textContent = formatCode(code);
      }
      const { morceaux } = S.vue.envoi; let i = 0;
      const canvas = el.querySelector('#qr'), compte = el.querySelector('#compte');
      const tic = () => {
        if (!document.body.contains(canvas)) { clearInterval(minuteurEnvoi); return; }
        dessinerQR(canvas, morceaux[i]); compte.textContent = `Morceau ${i + 1} sur ${morceaux.length} · le code défile tout seul`;
        i = (i + 1) % morceaux.length;
      };
      tic(); minuteurEnvoi = setInterval(tic, morceaux.length > 1 ? 450 : 2000);
    }
  };
}

// ---------- Recevoir ----------
let flot = null, boucle = null;
function arreterCamera() { if (boucle) cancelAnimationFrame(boucle); boucle = null; if (flot) flot.getTracks().forEach((t) => t.stop()); flot = null; }
window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#/recevoir')) arreterCamera(); });

function chargerJsQR() {
  if (window.jsQR) return Promise.resolve(window.jsQR);
  return new Promise((ok, ko) => { const s = document.createElement('script'); s.src = 'vendor/jsQR.js'; s.onload = () => ok(window.jsQR); s.onerror = ko; document.head.appendChild(s); });
}

export function vueRecevoir() {
  if (S.demo) return vueTransfert();
  const R = S.vue.reception || (S.vue.reception = { sid: null, n: 0, morceaux: {}, complet: false });
  const recus = Object.keys(R.morceaux).length;
  const pct = R.n ? Math.round(recus / R.n * 100) : 0;
  return {
    html: `${enteteRetour('Recevoir', '#/sauvegarde')}
      <div class="page" style="margin-top:.75rem">
        ${R.complet ? `
          <div class="carte" style="display:flex;gap:.625rem;align-items:center;color:var(--vert)">${ic('coche')}<b>Tout est reçu.</b></div>
          <label class="champ"><span>Code affiché sur l'autre téléphone</span><input id="code" autocomplete="off" autocapitalize="characters" inputmode="text" placeholder="XXXX-XXXX" maxlength="9" style="font-size:1.375rem;letter-spacing:.08em;text-transform:uppercase"></label>
          <button class="btn principal plein" id="importer">Importer mes données</button>
          <p class="petit" style="margin:0">Les données actuelles de ce téléphone seront remplacées.</p>`
        : `
          <p class="texte">Sur l'ancien téléphone : <b>Sauvegarde › Envoyer</b>. Puis vise le code qui défile avec ce téléphone.</p>
          <div class="video-boite"><video id="video" playsinline muted></video><div class="viseur" aria-hidden="true"></div>
            ${flot ? '' : `<button class="btn principal" id="camera">${ic('camera')}Ouvrir la caméra</button>`}</div>
          <div><div class="jauge" style="height:8px"><i style="width:${pct}%;background:var(--vert)"></i></div><p class="petit" id="etat" style="margin:.375rem 0 0" aria-live="polite">${R.n ? `${recus} morceau${recus > 1 ? 'x' : ''} sur ${R.n} · ${pct} %` : 'En attente du premier code…'}</p></div>
          <p class="petit" style="margin:0">La caméra sert uniquement à lire le code : aucune image n'est enregistrée ni envoyée.</p>`}
      </div>`,
    apres(el) {
      if (R.complet) {
        el.querySelector('#importer').onclick = async () => {
          const code = nettoyerCode(el.querySelector('#code').value);
          if (code.length !== 8) { toast('Le code fait 8 caractères'); return; }
          const texte = Array.from({ length: R.n }, (_, k) => R.morceaux[k + 1]).join('');
          try {
            const e = await deballer(texte, code);
            if (!confirm('Remplacer les données de ce téléphone par celles reçues ?')) return;
            S.etat = e; await St.enregistrer(S.etat); appliquerAffichage(); S.vue.reception = null;
            toast('Transfert terminé'); aller('#/planning');
          } catch (err) { toast(err.message, 4000); }
        };
        return;
      }
      const video = el.querySelector('#video');
      const demarrer = async () => {
        try {
          flot = flot || await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false });
        } catch (e) { toast('Impossible d\'ouvrir la caméra. Autorise-la dans les réglages du navigateur.', 4500); return; }
        video.srcObject = flot; await video.play().catch(() => {});
        const b = el.querySelector('#camera'); if (b) b.remove();
        scanner(video, el);
      };
      const b = el.querySelector('#camera'); if (b) b.onclick = demarrer;
      if (flot) demarrer();
    }
  };
}

async function scanner(video, el) {
  const R = S.vue.reception;
  let detecteur = null, lecteur = null;
  try { if ('BarcodeDetector' in window && (await BarcodeDetector.getSupportedFormats()).includes('qr_code')) detecteur = new BarcodeDetector({ formats: ['qr_code'] }); } catch (e) { /* repli */ }
  if (!detecteur) { try { lecteur = await chargerJsQR(); } catch (e) { toast('Lecteur de QR code indisponible'); return; } }
  const c = document.createElement('canvas'); const ctx = c.getContext('2d', { willReadFrequently: true });
  let dernier = 0;
  const etape = async (t) => {
    if (!flot || !document.body.contains(video)) return;
    boucle = requestAnimationFrame(etape);
    if (t - dernier < 110 || video.readyState < 2) return; dernier = t;
    const w = video.videoWidth, h = video.videoHeight, k = Math.min(1, 800 / Math.max(w, h));
    c.width = Math.round(w * k); c.height = Math.round(h * k); ctx.drawImage(video, 0, 0, c.width, c.height);
    let textes = [];
    try {
      if (detecteur) textes = (await detecteur.detect(c)).map((x) => x.rawValue);
      else { const r = lecteur(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height, { inversionAttempts: 'dontInvert' }); if (r) textes = [r.data]; }
    } catch (e) { return; }
    for (const txt of textes) {
      const m = /^MT1\|([A-Z0-9]{4})\|(\d+)\|(\d+)\|(.+)$/s.exec(txt || '');
      if (!m) continue;
      if (R.sid !== m[1]) { R.sid = m[1]; R.n = Number(m[3]); R.morceaux = {}; }
      if (!R.morceaux[m[2]]) {
        R.morceaux[m[2]] = m[4];
        if (navigator.vibrate) navigator.vibrate(15);
        const recus = Object.keys(R.morceaux).length;
        const etat = el.querySelector('#etat'), j = el.querySelector('.jauge i');
        if (etat) etat.textContent = `${recus} morceau${recus > 1 ? 'x' : ''} sur ${R.n} · ${Math.round(recus / R.n * 100)} %`;
        if (j) j.style.width = `${Math.round(recus / R.n * 100)}%`;
        if (recus === R.n) { R.complet = true; arreterCamera(); S.rendre(); return; }
      }
    }
  };
  boucle = requestAnimationFrame(etape);
}
