document.addEventListener('DOMContentLoaded', () => {
  // ── Logo intro overlay (home page only) ───────────────────────────
  const isHome   = !!document.querySelector('.home-hero');
  const INTRO_MS = isHome ? 4400 : 0; // must match CSS logoEntrance duration

  if (isHome) {
    document.body.classList.add('home-page');

    const overlay = Object.assign(document.createElement('div'), { id: 'intro-overlay' });
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:999;' +
      'background:#0b190b;' +
      'pointer-events:none;' +
      'transition:opacity 200ms ease';
    document.body.appendChild(overlay);

    // Fade triggered by the actual animationend event on the logo
    // so it fires the exact instant the entrance animation finishes.
    let faded = false;
    const doFade = () => {
      if (faded) return;
      faded = true;
      overlay.style.opacity = '0';
      overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    };
    const logoEl = document.querySelector('.header-logo');
    if (logoEl) {
      logoEl.addEventListener('animationend', (e) => {
        if (e.animationName === 'logoEntrance') doFade();
      });
    }
    // Fallback in case animationend doesn't fire
    setTimeout(doFade, INTRO_MS + 200);
  }
  // ─────────────────────────────────────────────────────────────────

  // Icons
  if (window.lucide) lucide.createIcons();

  // Mobile nav
  const burger = document.querySelector('.hamburger');
  const nav = document.querySelector('.nav-links');
  if (burger && nav) {
    // Modern pill label (hidden on desktop via hamburger display:none)
    const burgerLabel = document.createElement('span');
    burgerLabel.className = 'hamburger-label';
    burgerLabel.textContent = 'MENU';
    burger.appendChild(burgerLabel);

    burger.addEventListener('click', () => {
      nav.classList.toggle('open');
      const isOpen = nav.classList.contains('open');
      const icon = burger.querySelector('i');
      if (icon) icon.setAttribute('data-lucide', isOpen ? 'x' : 'menu');
      burgerLabel.textContent = isOpen ? 'CLOSE' : 'MENU';
      if (window.lucide) lucide.createIcons();
    });
  }

  // Sticky header
  const header = document.querySelector('header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) header?.classList.add('scrolled');
    else header?.classList.remove('scrolled');
  });

  // Reveal on scroll
  const reveals = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('active');
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
  reveals.forEach((el) => io.observe(el));

  // Parallax for non-hero media
  const parallax = document.querySelectorAll('.parallax');
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    parallax.forEach((el) => {
      if (el.closest('.hero')) return;
      el.style.transform = `translateY(${y * 0.25}px)`;
    });
  });

  // Fan accordion
  const fan = document.querySelector('.fan-accordion');
  if (fan) {
    const panels = fan.querySelectorAll('.fan-panel');
    panels.forEach((panel) => {
      panel.addEventListener('click', () => {
        panels.forEach((p) => p.classList.remove('open'));
        panel.classList.add('open');
      });
    });
  }

  // Current year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Paw print generator
  const pawContainer = document.createElement('div');
  pawContainer.className = 'paws';
  document.body.appendChild(pawContainer);
  for (let i = 0; i < 8; i++) {
    const paw = document.createElement('i');
    paw.setAttribute('data-lucide', 'paw-print');
    paw.className = 'paw';
    paw.style.left = `${Math.random() * 100}vw`;
    const size = 22 + Math.floor(Math.random() * 38);
    paw.setAttribute('width', `${size}px`);
    paw.setAttribute('height', `${size}px`);
    paw.style.width = `${size}px`;
    paw.style.height = `${size}px`;
    paw.style.animationDuration = `${16 + Math.random() * 14}s`;
    paw.style.animationDelay = `${Math.random() * 10}s`;
    pawContainer.appendChild(paw);
  }
  if (window.lucide) lucide.createIcons();

  // Simple form feedback
  const form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const original = btn?.textContent;
      if (btn) { btn.textContent = 'Message sent!'; btn.disabled = true; }
      form.reset();
      setTimeout(() => { if (btn) { btn.textContent = original; btn.disabled = false; } }, 2500);
    });
  }

  // Film roll lightbox
  const filmFrames = document.querySelectorAll('.film-frame');
  if (filmFrames.length) {
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML = '<button class="lightbox-close" aria-label="Close">&times;</button><img src="" alt="" />';
    document.body.appendChild(lb);
    const lbImg = lb.querySelector('img');
    const closeBtn = lb.querySelector('.lightbox-close');

    const closeLb = () => lb.classList.remove('open');
    closeBtn.addEventListener('click', closeLb);
    lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });

    filmFrames.forEach((frame) => {
      frame.addEventListener('click', () => {
        const img = frame.querySelector('img');
        lbImg.src = img.src;
        lbImg.alt = img.alt;
        lb.classList.add('open');
      });
    });
  }

  // HLS background videos – load immediately but defer play until intro ends
  document.querySelectorAll('video source[src*=".m3u8"]').forEach((source) => {
    const video = source.parentElement;
    const src = source.src;
    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play(); });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.play();
    }
  });
});
