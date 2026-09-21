(() => {
  let language = 'en';
  try { language = localStorage.getItem('kingdom3981-language') || 'en'; } catch (_) {}
  if (!Object.hasOwn(translations, language)) language = 'en';
  window.t = key => translations[language][key] ?? translations.en[key] ?? key;
  window.showMessage = key => {
    const box = document.querySelector('.toast');
    box.dataset.message = key; box.textContent = t(key); box.hidden = false;
    clearTimeout(window.messageTimer);
    window.messageTimer = setTimeout(() => { box.hidden = true; }, 9000);
  };
  window.applyLanguage = (selected = language) => {
    language = Object.hasOwn(translations, selected) ? selected : 'en';
    document.documentElement.lang = language;
    document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
    document.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
    document.querySelectorAll('[data-i18n-alt]').forEach(el => el.alt = t(el.dataset.i18nAlt));
    document.querySelectorAll('[data-lang]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.lang === language)));
    const key = 'title' + document.body.dataset.page;
    if (translations.en[key]) document.title = t(key);
    const box = document.querySelector('.toast');
    if (box?.dataset.message) box.textContent = t(box.dataset.message);
    try { localStorage.setItem('kingdom3981-language', language); } catch (_) {}
    document.dispatchEvent(new Event('languagechange'));
  };
  document.querySelectorAll('[data-lang]').forEach(el => el.addEventListener('click', () => applyLanguage(el.dataset.lang)));
  document.querySelectorAll('[data-discord]').forEach(el => el.addEventListener('click', () => {
    try {
      const url = new URL(SITE_CONFIG.discordUrl);
      if (url.protocol !== 'https:') throw new Error('HTTPS required');
      window.open(url.href, '_blank', 'noopener,noreferrer');
    } catch (_) { showMessage('discordMissing'); }
  }));
  applyLanguage();
})();
