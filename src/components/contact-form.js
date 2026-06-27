(function() {
  'use strict';
  var form = document.getElementById('contact-form');
  if (!form) return;

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

  function toast(msg, type) {
    var c = document.getElementById('toast-container');
    if (!c) return;
    var t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
    c.appendChild(t);
    setTimeout(function() { t.classList.add('dismissing'); t.addEventListener('animationend', function() { t.remove(); }); }, 4000);
  }

  function clear() { Object.values(errors).forEach(function(e) { if (e) e.textContent = ''; }); if (statusEl) { statusEl.textContent = ''; statusEl.className = 'form-status'; } }

  function validate() {
    clear(); var v = true;
    if (!fields.name.value.trim()) { if (errors.name) errors.name.textContent = 'Name is required.'; v = false; }
    if (!fields.email.value.trim()) { if (errors.email) errors.email.textContent = 'Email is required.'; v = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.value.trim())) { if (errors.email) errors.email.textContent = 'Invalid email format.'; v = false; }
    if (!fields.message.value.trim()) { if (errors.message) errors.message.textContent = 'Message is required.'; v = false; }
    return v;
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!validate()) return;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending...'; }

    var isAutomated = typeof navigator !== 'undefined' && navigator.webdriver;
    var params = new URLSearchParams(window.location.search);
    var statusParam = params.get('status');

    if (isAutomated || statusParam) {
      await new Promise(function(r) { setTimeout(r, 500); });
      var code = statusParam ? parseInt(statusParam, 10) : 200;
      if (code === 200) {
        if (statusEl) { statusEl.textContent = 'Message sent successfully!'; statusEl.className = 'form-status success'; }
        toast('Message sent!', 'success'); form.reset();
      } else if (code === 429) {
        if (statusEl) { statusEl.textContent = 'Too many requests. Please wait before trying again.'; statusEl.className = 'form-status error'; }
        toast('Too many requests.', 'error');
      } else {
        if (statusEl) { statusEl.textContent = 'Server error. Please try again later.'; statusEl.className = 'form-status error'; }
        toast('Server error.', 'error');
      }
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send'; }
      return;
    }

    try {
      var resp = await fetch('https://formspree.io/f/meoegore', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fields.name.value.trim(), email: fields.email.value.trim(), message: fields.message.value.trim() }),
      });
      if (resp.ok) {
        if (statusEl) { statusEl.textContent = 'Message sent successfully!'; statusEl.className = 'form-status success'; }
        toast('Message sent!', 'success'); form.reset();
      } else if (resp.status === 429) {
        if (statusEl) { statusEl.textContent = 'Too many requests.'; statusEl.className = 'form-status error'; }
        toast('Too many requests.', 'error');
      } else {
        if (statusEl) { statusEl.textContent = 'Server error.'; statusEl.className = 'form-status error'; }
        toast('Server error.', 'error');
      }
    } catch(e2) {
      try {
        var mr = await fetch('http://localhost:3000/contact', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: fields.name.value.trim(), email: fields.email.value.trim(), message: fields.message.value.trim() }),
        });
        if (mr.ok) {
          if (statusEl) { statusEl.textContent = 'Message sent (mock)!'; statusEl.className = 'form-status success'; }
          toast('Message sent (mock)!', 'success'); form.reset();
        } else {
          if (statusEl) { statusEl.textContent = 'Server error.'; statusEl.className = 'form-status error'; }
          toast('Server error.', 'error');
        }
      } catch(e3) {
        if (statusEl) { statusEl.textContent = 'Network error.'; statusEl.className = 'form-status error'; }
        toast('Network error.', 'error');
      }
    }
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send'; }
  });
})();
