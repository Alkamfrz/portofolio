// home.js — contact form + project filter (page-specific for index.astro)
(function () {
  // ── Contact form ──
  var form = document.getElementById('contact-form');
  if (form) {
    var fields = {
      name: form.querySelector('[name="name"]'),
      email: form.querySelector('[name="email"]'),
      message: form.querySelector('[name="message"]'),
    };
    var errors = {
      name: document.getElementById('name-error'),
      email: document.getElementById('email-error'),
      message: document.getElementById('message-error'),
    };
    var statusEl = document.getElementById('contact-status');
    var submitBtn = form.querySelector('[type="submit"]');
    var honeypot = form.querySelector('[name="website"]');

    function clearErrors() {
      Object.values(errors).forEach(function (e) { if (e) e.textContent = ''; });
      if (statusEl) {
        statusEl.style.display = 'none';
        statusEl.textContent = '';
        statusEl.className = 'form-status';
      }
    }

    function showStatus(msg, type) {
      if (!statusEl) return;
      statusEl.textContent = msg;
      statusEl.className = 'form-status ' + type;
      statusEl.style.display = 'block';
    }

    function validate() {
      clearErrors();
      var valid = true;
      if (!fields.name.value.trim()) {
        if (errors.name) errors.name.textContent = 'Name is required.';
        valid = false;
      }
      if (!fields.email.value.trim()) {
        if (errors.email) errors.email.textContent = 'Email is required.';
        valid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.value.trim())) {
        if (errors.email) errors.email.textContent = 'Enter a valid email address.';
        valid = false;
      }
      if (!fields.message.value.trim()) {
        if (errors.message) errors.message.textContent = 'Message is required.';
        valid = false;
      }
      return valid;
    }

    // ── Copy email ──
    var email = 'alkamfrz' + '@' + 'gmail.com';
    var emailLink = document.getElementById('email-link');
    if (emailLink) {
      emailLink.href = 'mailto:' + email;
    }
    var copyBtn = document.getElementById('copy-email-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(email).then(function () {
            copyBtn.textContent = '✓';
            copyBtn.style.color = 'var(--green)';
            copyBtn.style.borderColor = 'var(--green)';
            setTimeout(function () {
              copyBtn.textContent = '⎘';
              copyBtn.style.color = '';
              copyBtn.style.borderColor = '';
            }, 2000);
          });
        }
      });
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!validate()) return;

      // Reject if honeypot is filled (bot)
      if (honeypot && honeypot.value.trim()) {
        showStatus("Message sent. I'll be in touch soon.", 'success');
        form.reset();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
      }

      try {
        var resp = await fetch(form.action, {
          method: form.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: fields.name.value.trim(),
            email: fields.email.value.trim(),
            message: fields.message.value.trim(),
          }),
        });
        if (resp.ok) {
          showStatus("Message sent. I'll be in touch soon.", 'success');
          form.reset();
        } else if (resp.status === 429) {
          showStatus('Too many requests. Please wait.', 'error');
        } else {
          showStatus('Something went wrong. Try again.', 'error');
        }
      } catch (err) {
        showStatus('Network error. Try emailing directly.', 'error');
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send message';
      }
    });
  }

  // ── Project filters ──
  var filterBar = document.querySelector('.filter-bar');
  var projectList = document.getElementById('project-list');
  if (filterBar && projectList) {
    var cards = Array.from(projectList.children).filter(function (el) {
      return el.matches('.project-card');
    });
    var btns = filterBar.querySelectorAll('.filter-btn');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        btns.forEach(function (b) {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        var filter = btn.getAttribute('data-filter');
        cards.forEach(function (card) {
          var scope = card.getAttribute('data-scope');
          card.style.display = filter === 'all' || scope === filter ? '' : 'none';
        });
      });
    });
  }
})();
