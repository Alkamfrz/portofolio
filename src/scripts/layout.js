import { navigate } from 'astro:transitions/client';

(function () {
  'use strict';

  var smoothNavBound = false;

  function bindSmoothNavigation() {
    if (smoothNavBound) return;
    smoothNavBound = true;

    document.addEventListener(
      'click',
      async function (e) {
        var a = e.target && e.target.closest ? e.target.closest('a') : null;
        if (!a) return;
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (a.target === '_blank' || a.hasAttribute('download') || a.hasAttribute('data-astro-reload')) return;

        var rawHref = a.getAttribute('href');
        if (!rawHref || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) return;

        var url = new URL(a.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.hash) return;

        e.preventDefault();
        try {
          await navigate(url.pathname + url.search + url.hash);
        } catch (_err) {
          window.location.assign(url.href);
        }
      },
      { capture: true },
    );
  }

  function init() {
    // ── Theme toggle ──
    var currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';

    function applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
      var sun = document.getElementById('icon-sun');
      var moon = document.getElementById('icon-moon');
      if (sun && moon) {
        sun.style.display = theme === 'dark' ? 'block' : 'none';
        moon.style.display = theme === 'dark' ? 'none' : 'block';
      }
    }

    applyTheme(currentTheme);

    var themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(currentTheme);
      });
    }

    // ── Active nav on scroll ──
    var sections = document.querySelectorAll('section[id]');
    var navLinks = document.querySelectorAll('.navbar-link');
    if (sections.length > 0) {
      function updateNav() {
        var scrollY = window.scrollY + 100;
        var found = false;
        sections.forEach(function (sec) {
          if (found) return;
          var top = sec.offsetTop;
          var height = sec.offsetHeight;
          if (scrollY >= top && scrollY < top + height) {
            navLinks.forEach(function (n) {
              n.classList.remove('active');
              if (n.getAttribute('href') === '#' + sec.id) {
                n.classList.add('active');
                found = true;
              }
            });
          }
        });
      }
      window.addEventListener('scroll', updateNav, { passive: true });
      if (navLinks.length > 0) navLinks[0].classList.add('active');
      updateNav();
    }

    // ── Mobile menu ──
    var menuBtn = document.getElementById('menu-btn');
    var overlay = document.getElementById('mobile-overlay');
    if (menuBtn && overlay) {
      function setMobileTabindex(enabled) {
        overlay.querySelectorAll('.mobile-nav-link').forEach(function (link) {
          link.setAttribute('tabindex', enabled ? '0' : '-1');
        });
      }

      setMobileTabindex(false);

      menuBtn.addEventListener('click', function () {
        var expanded = menuBtn.getAttribute('aria-expanded') === 'true' ? false : true;
        menuBtn.setAttribute('aria-expanded', expanded);
        overlay.setAttribute('aria-hidden', !expanded);
        document.body.classList.toggle('menu-open');
        setMobileTabindex(expanded);
      });

      overlay.querySelectorAll('.mobile-nav-link').forEach(function (link) {
        link.addEventListener('click', function () {
          menuBtn.setAttribute('aria-expanded', 'false');
          overlay.setAttribute('aria-hidden', 'true');
          document.body.classList.remove('menu-open');
        });
      });

      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          menuBtn.setAttribute('aria-expanded', 'false');
          overlay.setAttribute('aria-hidden', 'true');
          document.body.classList.remove('menu-open');
        }
      });
    }

    // ── Back to top ──
    var topBtn = document.getElementById('back-to-top');
    if (topBtn) {
      window.addEventListener(
        'scroll',
        function () {
          topBtn.classList.toggle('visible', window.scrollY > 400);
        },
        { passive: true },
      );

      topBtn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // ── Footer year ──
    var footerYear = document.getElementById('footer-year');
    if (footerYear) footerYear.textContent = new Date().getFullYear();
  }

  // Run on first load and after every View Transitions navigation
  bindSmoothNavigation();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  document.addEventListener('astro:page-load', init);
})();
