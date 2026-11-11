// Prépare le site à publier dans _site/ :
// - applique le nom et la couleur de l'appli partout ;
// - fabrique les icônes de l'appli à partir de l'image « icone » choisie dans Pages CMS ;
// - ajoute le nom de domaine personnalisé s'il y en a un ;
// - donne une version unique au service worker pour que les téléphones se mettent à jour.
// Lancé automatiquement par GitHub Actions à chaque modification.
import fs from 'node:fs';
import path from 'node:path';

const racine = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sortie = path.join(racine, '_site');
const ignorer = new Set(['.git', '.github', '_site', 'scripts', 'node_modules', 'README.md', 'tests', '.pages.yml', 'package.json', 'package-lock.json', '.gitignore']);

const cfg = JSON.parse(fs.readFileSync(path.join(racine, 'config/contenu.json'), 'utf8'));
const nom = String(cfg.nom || 'Mon Temps').trim();
const couleur = /^#[0-9a-fA-F]{6}$/.test(cfg.couleur || '') ? cfg.couleur : '#E30613';
const version = (process.env.GITHUB_SHA || String(Date.now())).slice(0, 12);

fs.rmSync(sortie, { recursive: true, force: true });
fs.mkdirSync(sortie);
for (const e of fs.readdirSync(racine)) if (!ignorer.has(e)) fs.cpSync(path.join(racine, e), path.join(sortie, e), { recursive: true });

const echappe = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
for (const f of ['index.html', 'app/index.html', 'mentions-legales.html']) {
  const p = path.join(sortie, f);
  fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/Mon Temps/g, echappe(nom)).replace(/#E30613/g, couleur));
}

const man = JSON.parse(fs.readFileSync(path.join(sortie, 'manifest.webmanifest'), 'utf8'));
man.name = nom; man.short_name = nom.length > 12 ? nom.slice(0, 12) : nom; man.theme_color = couleur;
fs.writeFileSync(path.join(sortie, 'manifest.webmanifest'), JSON.stringify(man, null, 2));

// Icônes de l'appli depuis l'image choisie (carrée de préférence, 512 px ou plus)
if (cfg.icone) {
  const source = path.join(racine, String(cfg.icone).replace(/^\/+/, ''));
  if (fs.existsSync(source)) {
    try {
      const sharp = (await import('sharp')).default;
      const fond = couleur;
      const carre = (taille) => sharp(source).resize(taille, taille, { fit: 'contain', background: '#ffffff' }).png();
      await carre(192).toFile(path.join(sortie, 'icons/icon-192.png'));
      await carre(512).toFile(path.join(sortie, 'icons/icon-512.png'));
      await carre(180).flatten({ background: '#ffffff' }).toFile(path.join(sortie, 'icons/apple-touch-icon.png'));
      await carre(64).toFile(path.join(sortie, 'icons/favicon-64.png'));
      // Version « maskable » : l'image au centre, avec une marge, sur fond de couleur
      const interieur = await sharp(source).resize(358, 358, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
      await sharp({ create: { width: 512, height: 512, channels: 4, background: fond } }).composite([{ input: interieur, gravity: 'center' }]).png().toFile(path.join(sortie, 'icons/maskable-512.png'));
      console.log('Icônes fabriquées depuis', cfg.icone);
    } catch (e) { console.warn('Icône personnalisée ignorée :', e.message); }
  } else console.warn('Image d\'icône introuvable :', cfg.icone);
}

// Statistique d'installation facultative : on autorise l'envoi du petit signal seulement si un code est saisi.
const gc = String((cfg.statistiques && cfg.statistiques.goatcounter) || '').trim().toLowerCase();
if (/^[a-z0-9-]{2,40}$/.test(gc)) {
  const p = path.join(sortie, 'app/index.html');
  fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace("img-src 'self' data: blob:", `img-src 'self' data: blob: https://${gc}.goatcounter.com`));
  console.log('Statistique d\'installation activée (GoatCounter).');
}

// Nom de domaine personnalisé
const domaine = String(cfg.domaine || '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
if (domaine) fs.writeFileSync(path.join(sortie, 'CNAME'), domaine + '\n');

const sw = path.join(sortie, 'sw.js');
fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace('__VERSION__', version));
fs.writeFileSync(path.join(sortie, '.nojekyll'), '');

console.log(`Site prêt : « ${nom} », version ${version}${domaine ? ', domaine ' + domaine : ''}`);
