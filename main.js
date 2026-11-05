/* The Solutionista: shared site behaviour
   1. Header turns solid after 80px of scroll
   2. Mobile overlay menu (focus trap, Escape, scroll lock)
   3. Footer year
   4. One-time scroll reveals
   The current page's nav link is marked in the HTML with aria-current="page". */
(() => {
  'use strict';

  const root = document.documentElement;
  const header = document.querySelector('[data-header]');
  const main = document.getElementById('main');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 1024px)');

  /* ---------- 1. Header: transparent → bone after 80px ---------- */
  const SCROLL_THRESHOLD = 80;
  let ticking = false;

  const updateHeader = () => {
    header.classList.toggle('is-scrolled', window.scrollY > SCROLL_THRESHOLD);
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateHeader);
      ticking = true;
    }
  }, { passive: true });
  updateHeader();

  /* ---------- 2. Mobile overlay menu ---------- */
  const menu = document.getElementById('mobile-menu');
  const openBtn = document.querySelector('[data-menu-open]');
  const closeBtn = menu.querySelector('[data-menu-close]');
  const FOCUSABLE = 'a[href], button:not([disabled])';
  let lastFocus = null;
  let hideTimer = null;

  const setBackgroundInert = (state) => {
    [header, main, document.querySelector('.site-footer')]
      .filter(Boolean)
      .forEach((el) => { el.inert = state; });
  };

  const onKeydown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = [...menu.querySelectorAll(FOCUSABLE)];
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  function openMenu() {
    clearTimeout(hideTimer);
    lastFocus = document.activeElement;

    root.style.setProperty('--scrollbar-comp', `${window.innerWidth - root.clientWidth}px`);
    root.classList.add('is-locked');

    menu.hidden = false;
    menu.classList.remove('is-closing');
    void menu.offsetHeight; // commit display before fading in
    menu.classList.add('is-open');

    openBtn.setAttribute('aria-expanded', 'true');
    setBackgroundInert(true);
    document.addEventListener('keydown', onKeydown);
    closeBtn.focus();
  }

  function closeMenu({ restoreFocus = true } = {}) {
    if (menu.hidden) return;

    openBtn.setAttribute('aria-expanded', 'false');
    setBackgroundInert(false);
    root.classList.remove('is-locked');
    document.removeEventListener('keydown', onKeydown);

    const finish = () => {
      menu.classList.remove('is-open', 'is-closing');
      menu.hidden = true;
    };

    if (reduceMotion.matches) {
      finish();
    } else {
      menu.classList.add('is-closing');
      hideTimer = setTimeout(finish, 400);
    }

    if (restoreFocus && lastFocus) lastFocus.focus({ preventScroll: true });
  }

  openBtn.addEventListener('click', openMenu);
  closeBtn.addEventListener('click', () => closeMenu());

  // Menu links: unlock scroll first, then glide to the section
  menu.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const target = document.querySelector(link.hash);
    if (!target) return;

    e.preventDefault();
    closeMenu({ restoreFocus: false });
    target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    history.pushState(null, '', link.hash);
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  desktop.addEventListener('change', (e) => {
    if (e.matches) closeMenu({ restoreFocus: false });
  });

  /* ---------- Footer year stays current ---------- */
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- 4. Scroll reveal (shared by every section) ---------- */
  document.querySelectorAll('[data-reveal-group]').forEach((group) => {
    group.querySelectorAll('[data-reveal]').forEach((el, i) => {
      el.style.setProperty('--stagger', i);
    });
  });

  const revealEls = document.querySelectorAll('[data-reveal], [data-scene]');

  if (!('IntersectionObserver' in window) || reduceMotion.matches) {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach((el) => revealObserver.observe(el));
  }
})();
