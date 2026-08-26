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
      'opacity:0.9999;' +       // sub-1 forces browser to composite video beneath
      'transition:opacity 600ms ease';
    document.body.appendChild(overlay);

    let faded = false;
    const doFade = () => {
      if (faded) return;
      faded = true;
      overlay.style.opacity = '0';
      overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    };

    // Start fading when logo reaches centre of screen (48% keyframe ≈ 2112ms)
    // 600ms fade → overlay fully gone at ~2700ms while logo still sweeps to corner
    setTimeout(doFade, Math.round(INTRO_MS * 0.48));
    // Fallback
    setTimeout(doFade, INTRO_MS + 200);
  }
  // ─────────────────────────────────────────────────────────────────

  // ── Logo shine sweep ────────────────────────────────────────
  document.querySelectorAll('.header-logo').forEach(img => {
    const wrap = document.createElement('span');
    wrap.className = 'logo-shine-wrap';
    // Home page: shine fires after logoEntrance settles (4.4 s); other pages: 0.4 s
    wrap.style.setProperty('--shine-delay', isHome ? '4.5s' : '0.4s');
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);
  });
  // ────────────────────────────────────────────────────────────

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

  // Contact form – send via API and show thank you popup
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    const popup = document.getElementById('thank-you-popup');

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = contactForm.querySelector('button[type="submit"]');
      const originalHTML = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="loader-2"></i> Sending\u2026';
      btn.disabled = true;
      if (window.lucide) lucide.createIcons();

      const data = Object.fromEntries(new FormData(contactForm));

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Something went wrong.');
        contactForm.reset();
        if (popup) popup.classList.add('active');
      } catch (err) {
        alert('Sorry, we could not send your message: ' + err.message);
      } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
        if (window.lucide) lucide.createIcons();
      }
    });

    // Close popup on button click or backdrop click
    if (popup) {
      popup.addEventListener('click', (e) => {
        if (e.target === popup || e.target.hasAttribute('data-close-popup')) {
          popup.classList.remove('active');
        }
      });
    }
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
