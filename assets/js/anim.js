// Ploméo — animations immersives (vanilla, additif).
// Spec : docs/superpowers/specs/2026-06-01-animations-immersives-design.md
(() => {
  const root = document.documentElement;
  const body = document.body;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;

  /* ---------- Scrollspy : lien de nav actif (tous les modes) ---------- */
  const navLinks = [...document.querySelectorAll('.lhead__nav a')];
  const spied = navLinks.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if (spied.length) {
    const spy = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const id = '#' + e.target.id;
      navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    spied.forEach(s => spy.observe(s));
  }

  if (reduce) return; // a11y : aucune animation, contenu statique et visible.
  root.classList.add('js-anim'); // déjà posé par le <head> ; sûr en double.

  /* ---------- Reveals au scroll ---------- */
  const revIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const parent = el.closest('[data-stagger]');
    if (parent) {
      const kids = [...parent.querySelectorAll('[data-reveal]')];
      el.style.transitionDelay = (Math.max(0, kids.indexOf(el)) * 0.09) + 's';
    }
    el.classList.add('is-in');
    revIO.unobserve(el);
  }), { threshold: 0.18 });
  document.querySelectorAll('[data-reveal]').forEach(el => revIO.observe(el));

  /* ---------- Smooth-scroll Lenis (desktop) ---------- */
  let lenis = null;
  if (fine && window.Lenis) {
    root.style.scrollBehavior = 'auto';
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', ev => {
        const t = document.querySelector(a.getAttribute('href'));
        if (!t) return;
        ev.preventDefault();
        lenis.scrollTo(t, { offset: -8 });
      });
    });
  }

  /* ---------- Parallaxe scroll (positions en cache, pas de feedback) ---------- */
  const para = [...document.querySelectorAll('[data-parallax]')].map(el => ({
    el, f: parseFloat(el.dataset.parallax) || 0, top: 0, h: 0
  }));
  function measurePara() {
    para.forEach(p => { p.el.style.transform = ''; });
    para.forEach(p => { const r = p.el.getBoundingClientRect(); p.top = r.top + scrollY; p.h = r.height; });
  }
  measurePara();
  addEventListener('resize', measurePara, { passive: true });

  /* ---------- Souris : curseur, parallaxe, magnétique, tilt (desktop) ---------- */
  const dot = document.querySelector('.cursordot');
  const ring = document.querySelector('.cursorring');
  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
  if (fine) {
    body.classList.add('cursor-on');
    const mouseEls = [...document.querySelectorAll('[data-mouse]')].map(el => ({ el, f: parseFloat(el.dataset.mouse) || 0 }));
    addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      if (dot) { dot.style.left = mx + 'px'; dot.style.top = my + 'px'; }
      const cx = innerWidth / 2, cy = innerHeight / 2;
      mouseEls.forEach(({ el, f }) => {
        el.style.transform = `translate3d(${((mx - cx) * f).toFixed(1)}px, ${((my - cy) * f).toFixed(1)}px, 0)`;
      });
    }, { passive: true });
    document.querySelectorAll('a, button, .tilt, input, select, textarea').forEach(el => {
      el.addEventListener('mouseenter', () => ring && ring.classList.add('hot'));
      el.addEventListener('mouseleave', () => ring && ring.classList.remove('hot'));
    });
    document.querySelectorAll('.magnetic').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${((e.clientX - (r.left + r.width / 2)) * 0.35).toFixed(1)}px, ${((e.clientY - (r.top + r.height / 2)) * 0.35).toFixed(1)}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
    document.querySelectorAll('.tilt').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(800px) rotateY(${(px * 8).toFixed(2)}deg) rotateX(${(-py * 8).toFixed(2)}deg)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Boucle rAF unique : Lenis + progression + parallaxe ---------- */
  const bar = document.querySelector('.scrollbar');
  function frame(time) {
    if (lenis) lenis.raf(time);
    const max = root.scrollHeight - innerHeight;
    if (bar) bar.style.setProperty('--sp', (max > 0 ? scrollY / max : 0).toFixed(4));
    const mid = scrollY + innerHeight / 2;
    para.forEach(p => {
      const off = (p.top + p.h / 2) - mid;
      p.el.style.transform = `translate3d(0, ${(-off * p.f).toFixed(1)}px, 0)`;
    });
    if (fine && ring) { rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18; ring.style.left = rx + 'px'; ring.style.top = ry + 'px'; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
