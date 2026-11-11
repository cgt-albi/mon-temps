// Mon Temps — compteur d'installations, anonyme et facultatif.
// Désactivé tant qu'aucun code n'est saisi dans Pages CMS (Appli › Statistiques).
// Il n'envoie QUE deux évènements sans aucune donnée : « première ouverture » et « appli installée ».
// Aucun identifiant, aucun cookie, rien venant du planning. Une seule fois par appareil.
const cle = (n) => `mt-compte-${n}`;
const deja = (n) => { try { return localStorage.getItem(cle(n)) === '1'; } catch { return false; } };
const marquer = (n) => { try { localStorage.setItem(cle(n), '1'); } catch { /* ignoré */ } };

function envoyer(code, chemin, titre) {
  // Une simple image de 1 pixel : pas de script tiers, pas de cookie.
  const img = new Image(1, 1);
  img.referrerPolicy = 'no-referrer';
  img.src = `https://${encodeURIComponent(code)}.goatcounter.com/count?p=${encodeURIComponent(chemin)}&t=${encodeURIComponent(titre)}&e=true&rnd=${Math.random().toString(36).slice(2, 8)}`;
}

export function compterInstallations(S) {
  const code = String((S.cfg.statistiques && S.cfg.statistiques.goatcounter) || '').trim().toLowerCase();
  if (!/^[a-z0-9-]{2,40}$/.test(code) || S.demo) return;
  // Le signal part dès que le profil existe (fin de l'accueil), une seule fois.
  const verifier = () => { if (S.etat.profil && !S.demo && !deja('ouverture')) { marquer('ouverture'); envoyer(code, '/premiere-ouverture', 'Première ouverture'); } };
  verifier(); window.addEventListener('hashchange', verifier);
  window.addEventListener('appinstalled', () => { if (!deja('installee')) { marquer('installee'); envoyer(code, '/appli-installee', 'Appli installée'); } });
}
