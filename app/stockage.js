// Stockage local (IndexedDB, repli localStorage) et sauvegardes chiffrées.
// Rien ne quitte l'appareil : pas de serveur, pas de compte.

const BASE = 'mon-temps', MAGASIN = 'etat', CLE = 'principal';
export const FORMAT = 'mon-temps/sauvegarde';

export function etatVide() {
  return { version: 1, profil: null, jours: {}, preuves: [], codesPerso: [], departs: {}, cet: { mouvements: [] }, reglages: { theme: 'auto', taille: 0, controles: true }, derniereSauvegarde: null, creeLe: new Date().toISOString() };
}

function ouvrir() {
  return new Promise((ok, ko) => {
    if (!('indexedDB' in self)) return ko(new Error('IndexedDB indisponible'));
    const r = indexedDB.open(BASE, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(MAGASIN);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  });
}

export async function charger() {
  try {
    const db = await ouvrir();
    const v = await new Promise((ok, ko) => { const t = db.transaction(MAGASIN).objectStore(MAGASIN).get(CLE); t.onsuccess = () => ok(t.result); t.onerror = () => ko(t.error); });
    if (v) return normaliser(v);
  } catch (e) { /* repli */ }
  try { const s = localStorage.getItem(BASE); if (s) return normaliser(JSON.parse(s)); } catch (e) { /* rien */ }
  return null;
}

export async function enregistrer(etat) {
  const copie = JSON.parse(JSON.stringify(etat));
  try {
    const db = await ouvrir();
    await new Promise((ok, ko) => { const t = db.transaction(MAGASIN, 'readwrite'); t.objectStore(MAGASIN).put(copie, CLE); t.oncomplete = ok; t.onerror = () => ko(t.error); });
    return true;
  } catch (e) {
    try { localStorage.setItem(BASE, JSON.stringify(copie)); return true; } catch (e2) { return false; }
  }
}

export async function effacerTout() {
  try { const db = await ouvrir(); await new Promise((ok) => { const t = db.transaction(MAGASIN, 'readwrite'); t.objectStore(MAGASIN).delete(CLE); t.oncomplete = ok; t.onerror = ok; }); } catch (e) { /* rien */ }
  try { localStorage.removeItem(BASE); } catch (e) { /* rien */ }
}

// Demande au navigateur de ne pas effacer les données de lui-même.
export async function protegerStockage() {
  try {
    if (!navigator.storage || !navigator.storage.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch (e) { return null; }
}

export function normaliser(e) {
  const base = etatVide();
  const out = { ...base, ...e };
  out.reglages = { ...base.reglages, ...(e.reglages || {}) };
  for (const k of ['jours', 'departs']) if (!out[k] || typeof out[k] !== 'object') out[k] = {};
  // Ancien format : « reports » (solde au 1er janvier) devient un point de départ au 1er janvier.
  if (e.reports && typeof e.reports === 'object') {
    for (const [a, m] of Object.entries(e.reports)) if (!out.departs[a] && Number(m)) out.departs[a] = { date: `${a}-01-01`, soldeMin: Number(m) };
    delete out.reports;
  }
  if (!out.cet || !Array.isArray(out.cet.mouvements)) out.cet = { mouvements: [] };
  for (const k of ['preuves', 'codesPerso']) if (!Array.isArray(out[k])) out[k] = [];
  return out;
}

// ---------- Chiffrement (AES-GCM 256, clé dérivée du mot de passe par PBKDF2) ----------
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = (buf) => { let s = ''; const a = new Uint8Array(buf); for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function cle(motDePasse, sel, iter) {
  const base = await crypto.subtle.importKey('raw', enc.encode(motDePasse), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sel, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function chiffrer(etat, motDePasse) {
  const sel = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), iter = 310000;
  const k = await cle(motDePasse, sel, iter);
  const donnees = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, enc.encode(JSON.stringify(etat)));
  return JSON.stringify({ format: FORMAT, version: 1, creeLe: new Date().toISOString(), kdf: { nom: 'PBKDF2-SHA256', iterations: iter, sel: b64(sel) }, iv: b64(iv), donnees: b64(donnees) });
}

export async function dechiffrer(texte, motDePasse) {
  let f;
  try { f = JSON.parse(texte); } catch (e) { throw new Error("Ce fichier n'est pas une sauvegarde de l'appli."); }
  if (!f || f.format !== FORMAT) throw new Error("Ce fichier n'est pas une sauvegarde de l'appli.");
  try {
    const k = await cle(motDePasse, unb64(f.kdf.sel), f.kdf.iterations);
    const clair = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(f.iv) }, k, unb64(f.donnees));
    return normaliser(JSON.parse(dec.decode(clair)));
  } catch (e) { throw new Error('Mot de passe incorrect, ou fichier abîmé.'); }
}
