/* =========================================================
   CALQUE DE FOND (utilise data-bg-* si aucun fond n'est déjà en CSS)
========================================================= */
(() => {
  const bgEl = document.querySelector('.bg');
  const body = document.body;

  function updateBackground() {
    if (!bgEl || !body) return;

    // Si le CSS a déjà posé un background, on ne touche pas
    const computedBg = getComputedStyle(bgEl).backgroundImage;
    if (computedBg && computedBg !== 'none') return;

    const isMobile = window.matchMedia('(max-width: 720px)').matches;
    const bgDesktop = body.getAttribute('data-bg-desktop');
    const bgMobile  = body.getAttribute('data-bg-mobile');
    const fallback  = body.getAttribute('data-bg');
    const url = (isMobile ? (bgMobile || bgDesktop) : (bgDesktop || bgMobile)) || fallback;
    if (!url) return;

    bgEl.style.backgroundImage    = `url("${url}")`;
    bgEl.style.backgroundPosition = 'top center';
    bgEl.style.backgroundSize     = 'cover';
    bgEl.style.backgroundRepeat   = 'no-repeat';
  }

  updateBackground();
  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(updateBackground, 250); });
})();

/* =========================================================
   ANNÉE DANS LE FOOTER (si #year existe)
========================================================= */
(() => {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();

/* =========================================================
   TRANSITION FADE ENTRE PAGES (liens avec data-transition)
========================================================= */
document.querySelectorAll('a[data-transition]').forEach(a => {
  a.addEventListener('click', e => {
    if (a.target === '_blank' || e.metaKey || e.ctrlKey) return; // nouveaux onglets
    e.preventDefault();
    const href = a.getAttribute('href');
    document.body.classList.add('fade-out');
    setTimeout(() => { window.location.href = href; }, 200);
  });
});

/* =========================================================
   PROJECT (Option B): charger data/projects.json + remplir page + prev/next
========================================================= */
(async () => {
  const gallery = document.querySelector('.project-gallery');
  if (!gallery) return; // ne s'exécute que sur la page projet

  const titleEl = document.getElementById('p-title');
  const metaEl  = document.getElementById('p-meta');
  const aPrev   = document.querySelector('.nav-prev');
  const aNext   = document.querySelector('.nav-next');

  // ID dans l'URL, défaut "01"
  const qs = new URLSearchParams(location.search);
  const id = (qs.get('id') || '01').padStart(2, '0');

  // Charger le catalogue
  let data;
  try {
    const res = await fetch('data/projects.json', { cache: 'no-store' });
    data = await res.json();
  } catch (e) {
    if (titleEl) titleEl.textContent = 'Erreur de chargement';
    console.error('[projects.json] load error:', e);
    return;
  }

  const list = (data && data.projects) || [];
  const idx  = list.findIndex(p => p.id === id);
  const p    = idx >= 0 ? list[idx] : null;

  if (!p) {
    if (titleEl) titleEl.textContent = 'Projet introuvable';
    gallery.innerHTML = '';
    if (aPrev) aPrev.removeAttribute('href');
    if (aNext) aNext.removeAttribute('href');
    return;
  }

  // Titre / meta / <title>
  document.title = `${p.title || ('Projet ' + p.id)} — Philémon Croc`;
  if (titleEl) titleEl.textContent = p.title || `Projet ${p.id}`;
  if (metaEl)  metaEl.textContent  = p.meta  || '';

  // Galerie verticale
  gallery.innerHTML = (p.images || []).map((name, i) => `
    <figure class="project-photo">
      <img src="${p.base}${name}" alt="${(p.title || 'Projet') + ' — photo ' + (i+1)}">
    </figure>
  `).join('');

  // Prev / Next (bouclés)
  const prevId = list[(idx - 1 + list.length) % list.length].id;
  const nextId = list[(idx + 1) % list.length].id;
  if (aPrev) aPrev.href = `photo-projects.html?id=${prevId}`;
  if (aNext) aNext.href = `photo-projects.html?id=${nextId}`;

  // Pour le lightbox inter-projets
  document.body.dataset.project     = p.id;
  document.body.dataset.projectPrev = prevId;
  document.body.dataset.projectNext = nextId;

  // >>> prévenir la lightbox que la galerie est prête
  document.dispatchEvent(new CustomEvent('project:ready', {
    detail: { count: (p.images || []).length }
  }));
})();

/* =========================================================
   LIGHTBOX plein écran (délégué) + chainage inter-projets
========================================================= */
(() => {
  const lb = document.querySelector('.lightbox');
  const gallery = document.querySelector('.project-gallery');
  if (!lb || !gallery) return;

  const media    = lb.querySelector('.lb-media');
  const btnPrev  = lb.querySelector('.lb-prev');
  const btnNext  = lb.querySelector('.lb-next');
  const btnClose = lb.querySelector('.lb-close');
  let imgs = [];
  let idx  = 0;

  const lockScroll = (on) => {
    document.documentElement.style.overflow = on ? 'hidden' : '';
    document.body.style.overflow = on ? 'hidden' : '';
  };
  const refreshImgs = () => { imgs = Array.from(gallery.querySelectorAll('img')); };
  const preload = (n) => { if (n>=0 && n<imgs.length){ const im = new Image(); im.src = imgs[n].src; } };

  const show = (i) => {
    // Dépassement à gauche → projet précédent en lightbox, image = dernière
    if (i < 0) {
      const prevId = document.body.dataset.projectPrev;
      if (prevId) {
        document.body.classList.remove('fade-out');
        location.href = `photo-projects.html?id=${prevId}&lb=1&img=-1`;
      }
      return;
    }
    // Dépassement à droite → projet suivant en lightbox, image = première
    if (i >= imgs.length) {
      const nextId = document.body.dataset.projectNext;
      if (nextId) {
        document.body.classList.remove('fade-out');
        location.href = `photo-projects.html?id=${nextId}&lb=1&img=0`;
      }
      return;
    }

    const el = imgs[i];
    media.src = el.src;
    media.alt = el.alt || '';
    preload(i+1); preload(i-1);
  };

  const open  = (i) => { refreshImgs(); idx = i; show(idx); lb.classList.add('open'); lockScroll(true); };
  const close = () => { lb.classList.remove('open'); lockScroll(false); };
  const next  = () => show(++idx);
  const prev  = () => show(--idx);

  // Ouvrir au clic (délégation)
  gallery.addEventListener('click', (e) => {
    const target = e.target.closest('img');
    if (!target) return;
    refreshImgs();
    const i = imgs.indexOf(target);
    if (i >= 0) open(i);
  });

  // Boutons
  btnNext.addEventListener('click', next);
  btnPrev.addEventListener('click', prev);
  btnClose.addEventListener('click', close);

  // Clavier
  window.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  });

  // Fermer si clic sur le fond
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });

  // >>> Auto-open (supporte le chainage inter-projets)
  const params   = new URLSearchParams(location.search);
  const wantLB   = params.get('lb') === '1';
  let startIndex = parseInt(params.get('img') || '0', 10);
  if (Number.isNaN(startIndex)) startIndex = 0;

  const tryAutoOpen = () => {
    refreshImgs();
    if (!imgs.length) return false;
    if (startIndex < 0) startIndex = imgs.length - 1;
    if (startIndex >= imgs.length) startIndex = imgs.length - 1;
    open(startIndex);
    return true;
  };

  if (wantLB) {
    // Essaye tout de suite, sinon attends "project:ready"
    if (!tryAutoOpen()) {
      const onReady = () => { if (tryAutoOpen()) document.removeEventListener('project:ready', onReady); };
      document.addEventListener('project:ready', onReady);
    }
  }
})();

/* =========================================================
   PETIT GARDE-FOU (triangles accueil visibles si présents)
========================================================= */
(() => {
  const triWrap = document.querySelector('.tri-wrap');
  if (triWrap) {
    triWrap.style.opacity = '1';
    triWrap.style.visibility = 'visible';
  }
})();
