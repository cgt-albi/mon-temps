// Mon Temps — remplacement de textes : tout texte affiché peut être changé depuis Pages CMS
// (formulaires « Textes … »). Le texte d'origine est reconnu à l'identique ; s'il n'est pas modifié, rien ne change.
(() => {
  const base = new URL('config/', document.currentScript.src).href;
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const lire = (f) => fetch(base + f, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const vus = new WeakSet();
  let table = null;

  function traiter(racine) {
    if (!table || !racine) return;
    const w = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => { const p = n.parentNode && n.parentNode.nodeName; return p === 'SCRIPT' || p === 'STYLE' || p === 'TEXTAREA' || vus.has(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
    });
    const liste = []; while (w.nextNode()) liste.push(w.currentNode);
    for (const n of liste) {
      vus.add(n);
      const brut = n.nodeValue, cle = norm(brut); if (!cle) continue;
      const nouveau = table.get(cle);
      if (nouveau !== undefined) { const m = brut.match(/^(\s*)[\s\S]*?(\s*)$/); n.nodeValue = m[1] + nouveau + m[2]; }
    }
  }

  async function demarrer() {
    const index = await lire('textes-index.json'); if (!index || !index.fichiers) return;
    const [origine, ...fichiers] = await Promise.all([lire('textes-origine.json'), ...index.fichiers.map(lire)]);
    if (!origine) return;
    const t = new Map();
    for (const f of fichiers) for (const e of (f && f.textes) || []) {
      const o = origine[e.cle]; if (o === undefined || typeof e.texte !== 'string') continue;
      if (norm(e.texte) && e.texte.trim() !== o.trim()) t.set(norm(o), e.texte.trim());
    }
    if (!t.size) return;
    table = t;
    traiter(document.body);
    let attente = null;
    new MutationObserver(() => { clearTimeout(attente); attente = setTimeout(() => traiter(document.body), 0); }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer); else demarrer();
})();
