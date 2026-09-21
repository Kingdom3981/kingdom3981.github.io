// UTC hours are configured in config.js. Equal-to-now runs roll forward.
function nextBaulerRun(now, hours = SITE_CONFIG.baulerHoursUTC) {
  const next = new Date(now);
  const sorted = [...new Set(hours)].filter(h => Number.isInteger(h) && h >= 0 && h < 24).sort((a,b) => a-b);
  if (!sorted.length) return null;
  for (const hour of sorted) {
    next.setUTCHours(hour, 0, 0, 0);
    if (next > now) return next;
  }
  next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(sorted[0], 0, 0, 0);
  return next;
}
(() => {
  const pad = n => String(n).padStart(2,'0');
  const tick = () => {
    const now = new Date(), next = nextBaulerRun(now);
    if (!next) { document.querySelector('#countdown').textContent = '—'; return; }
    const seconds = Math.ceil((next-now)/1000);
    document.querySelector('#countdown').textContent = `${pad(Math.floor(seconds/3600))} : ${pad(Math.floor(seconds%3600/60))} : ${pad(seconds%60)}`;
    document.querySelector('#next-run').textContent = `${pad(next.getUTCHours())}:00 UTC`;
  };
  document.querySelector('#schedule-times').textContent = SITE_CONFIG.baulerHoursUTC.map(h => `${pad(h)}:00 UTC`).join('   ·   ');
  tick(); setInterval(tick,1000); document.addEventListener('visibilitychange', tick);
  const route = document.querySelector('#route-image');
  route.src = SITE_CONFIG.routeImage;
  // Remove fixed dimensions on a replacement so its natural proportions govern layout.
  if (!SITE_CONFIG.routeImage.includes('route-placeholder')) {
    route.removeAttribute('width'); route.removeAttribute('height');
    document.querySelector('.route figcaption').hidden = true;
  }
  const entries = [{src:SITE_CONFIG.routeImage,key:'routeAlt'}, ...SITE_CONFIG.usefulImages];
  const gallery = document.querySelector('#gallery');
  SITE_CONFIG.usefulImages.forEach((item,i) => {
    const figure = document.createElement('figure'), button = document.createElement('button'), img = document.createElement('img'), caption = document.createElement('figcaption');
    button.className = 'image-button'; button.dataset.i18nAria = 'inspect';
    img.src = item.src; img.loading = 'lazy'; img.dataset.i18nAlt = item.key;
    const title = document.createElement('span'); title.dataset.i18n = item.key; caption.append(title);
    if (/guide-\d\.svg$/.test(item.src)) { const note = document.createElement('small'); note.dataset.i18n = 'placeholder'; caption.append(note); }
    button.append(img); figure.append(button, caption); gallery.append(figure);
    button.addEventListener('click', () => open(i+1));
  });
  const dialog = document.querySelector('#lightbox');
  let current = 0;
  const render = () => {
    document.querySelector('#lightbox-image').src = entries[current].src;
    document.querySelector('#lightbox-image').alt = t(entries[current].key);
    document.querySelector('#lightbox-caption').textContent = t(entries[current].key);
  };
  const open = index => { current = index; render(); dialog.showModal(); document.body.style.overflow = 'hidden'; };
  const step = amount => { current = (current+amount+entries.length)%entries.length; render(); };
  document.querySelector('#route-open').addEventListener('click', () => open(0));
  document.querySelector('#lightbox-close').addEventListener('click', () => dialog.close());
  document.querySelector('#lightbox-prev').addEventListener('click', () => step(-1));
  document.querySelector('#lightbox-next').addEventListener('click', () => step(1));
  dialog.addEventListener('close', () => document.body.style.overflow = '');
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r=dialog.getBoundingClientRect(); if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) dialog.close(); } });
  dialog.addEventListener('keydown', event => { if(event.key==='ArrowRight') step(1); if(event.key==='ArrowLeft') step(-1); });
  document.addEventListener('languagechange', () => { if(dialog.open) render(); });
  applyLanguage();
})();
