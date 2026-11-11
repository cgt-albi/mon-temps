(async () => {
  try {
    const cfg = await (await fetch('config/contenu.json', { cache: 'no-cache' })).json();
    document.querySelectorAll('[data-syndicat]').forEach((e) => { e.textContent = cfg.syndicat; });
    document.title = `Mentions légales — ${cfg.nom}`;
    const t = [`Syndicat ${cfg.syndicat}.`];
    if (cfg.adressePostale) t.push(cfg.adressePostale + '.');
    if (cfg.responsablePublication) t.push(`Responsable de la publication : ${cfg.responsablePublication}.`);
    if (cfg.contacts && cfg.contacts.mailGeneral) t.push(`Contact : ${cfg.contacts.mailGeneral}.`);
    document.getElementById('editeur').textContent = t.join(' ');
  } catch (e) { /* rien */ }
})();
