import React, { useState } from 'react';

export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [status, setStatus] = useState(''); // 'success' | 'error' | ''
  const [statusText, setStatusText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset errors
    setNameError('');
    setEmailError('');
    setMessageError('');
    setStatus('');
    setStatusText('');

    let valid = true;

    if (!name.trim()) {
      setNameError('Name is required.');
      valid = false;
    }
    if (!email.trim()) {
      setEmailError('Email is required.');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError('Invalid email format.');
      valid = false;
    }
    if (!message.trim()) {
      setMessageError('Message is required.');
      valid = false;
    }

    if (!valid) return;

    setSubmitting(true);

    try {
      const pageParams = new URLSearchParams(window.location.search);
      const statusParam = pageParams.get('status') || '';
      const apiUrl = statusParam ? `/api/contact?status=${statusParam}` : '/api/contact';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setStatusText(data.message || 'Message sent successfully!');
        setName('');
        setEmail('');
        setMessage('');
      } else {
        setStatus('error');
        setStatusText(data.error || 'Something went wrong.');
      }
    } catch (err) {
      setStatus('error');
      setStatusText('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contact-form-wrapper">
      <form id="contact-form" onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="contact-name">Name</label>
          <input
            type="text"
            id="contact-name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
          />
          <span className="error-msg" id="name-error">{nameError}</span>
        </div>

        <div className="form-group">
          <label htmlFor="contact-email">Email</label>
          <input
            type="email"
            id="contact-email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            autoComplete="email"
          />
          <span className="error-msg" id="email-error">{emailError}</span>
        </div>

        <div className="form-group">
          <label htmlFor="contact-message">Message</label>
          <textarea
            id="contact-message"
            name="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Your message..."
            rows={5}
          />
          <span className="error-msg" id="message-error">{messageError}</span>
        </div>

        <button
          type="submit"
          id="contact-submit"
          disabled={submitting}
          className="submit-btn"
        >
          {submitting ? 'Sending...' : 'Send Message'}
        </button>

        {status && (
          <div id="contact-status" className={status}>
            {statusText}
          </div>
        )}
        {!status && (
          <div id="contact-status" style={{ display: 'none' }}></div>
        )}
      </form>

      <div className="social-links-section">
        <a
          id="contact-github"
          href="https://github.com/alkamfrz"
          target="_blank"
          rel="noopener noreferrer"
          className="social-link"
        >
          <span>GitHub</span>
        </a>
        <a
          id="contact-linkedin"
          href="https://linkedin.com/in/alkamfrz"
          target="_blank"
          rel="noopener noreferrer"
          className="social-link"
        >
          <span>LinkedIn</span>
        </a>
        <a
          id="contact-email-link"
          href="mailto:alkamfrz@gmail.com"
          className="social-link"
        >
          <span>Email</span>
        </a>
      </div>
    </div>
  );
}
