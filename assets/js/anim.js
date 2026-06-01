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
})();
