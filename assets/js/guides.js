(() => {
  const dialog = document.querySelector('#guide-viewer');
  if (!dialog) return;
  const image = document.querySelector('#guide-full');
  const viewport = dialog.querySelector('.guide-viewer-scroll');
  const zoom = document.querySelector('#guide-zoom');
  let opener, previousOverflow;
  function setZoom(actual) {
    viewport.classList.toggle('actual-size', actual);
    zoom.textContent = actual ? 'Fit to width' : 'Actual size';
    zoom.setAttribute('aria-pressed', String(actual));
  }
  document.querySelectorAll('.guide-image').forEach(link => {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      const preview = link.querySelector('img');
      image.src = link.href; image.alt = preview.alt;
      document.querySelector('#guide-original').href = link.href;
      document.querySelector('#guide-caption').textContent = preview.alt;
      setZoom(false);
      previousOverflow = document.body.style.overflow;
      dialog.showModal(); document.body.style.overflow = 'hidden';
      viewport.scrollTo(0,0); document.querySelector('#guide-close').focus();
    });
  });
  zoom.addEventListener('click', () => setZoom(!viewport.classList.contains('actual-size')));
  document.querySelector('#guide-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { document.body.style.overflow = previousOverflow || ''; opener?.focus(); });
  dialog.addEventListener('click', event => {
    if(event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if(event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom) dialog.close();
  });
})();
