import http from 'http';

const PORT = process.env.PORT || 3000;

const css = `
  body {
    background-color: #0f172a;
    color: #f8fafc;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    margin: 0;
    padding: 0;
  }
  .header {
    background: rgba(15, 23, 42, 0.8);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem 2rem;
  }
  .logo {
    font-size: 1.5rem;
    font-weight: bold;
    color: #38bdf8;
    text-decoration: none;
  }
  .nav-links {
    display: flex;
    gap: 2rem;
  }
  .nav-links a {
    color: #cbd5e1;
    text-decoration: none;
    transition: color 0.2s;
  }
  .nav-links a.active {
    color: #38bdf8;
    border-bottom: 2px solid #38bdf8;
  }
  .nav-links a:hover {
    color: #38bdf8;
  }
  .hamburger {
    display: none;
    background: none;
    border: none;
    color: #f8fafc;
    font-size: 1.5rem;
    cursor: pointer;
  }
  .container {
    max-width: 1200px;
    margin: 2rem auto;
    padding: 0 2rem;
  }
  .glass-card {
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 1rem;
    padding: 2rem;
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
  }
  @media (max-width: 480px) {
    .grid {
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    }
  }
  .tech-badge {
    display: inline-block;
    background: rgba(56, 189, 248, 0.2);
    color: #38bdf8;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.85rem;
    margin-right: 0.5rem;
    margin-bottom: 0.5rem;
  }
  .form-group {
    margin-bottom: 1rem;
    display: flex;
    flex-direction: column;
  }
  .form-group label {
    margin-bottom: 0.5rem;
    color: #cbd5e1;
  }
  .form-group input, .form-group textarea {
    background: rgba(15, 23, 42, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #f8fafc;
    padding: 0.75rem;
    border-radius: 0.5rem;
  }
  .form-group input:focus, .form-group textarea:focus {
    outline: none;
    border-color: #38bdf8;
  }
  .error-msg {
    color: #f87171;
    font-size: 0.85rem;
    margin-top: 0.25rem;
    min-height: 1.25rem;
  }
  #contact-status {
    margin-top: 1rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
    display: none;
  }
  #contact-status.success {
    display: block;
    background: rgba(34, 197, 94, 0.2);
    border: 1px solid rgb(34, 197, 94);
    color: #4ade80;
  }
  #contact-status.error {
    display: block;
    background: rgba(239, 68, 68, 0.2);
    border: 1px solid rgb(239, 68, 68);
    color: #f87171;
  }
  .footer {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding: 2rem;
    text-align: center;
    margin-top: 4rem;
  }
  .social-links a {
    color: #cbd5e1;
    text-decoration: none;
    margin: 0 1rem;
  }
  .social-links a:hover {
    color: #38bdf8;
  }
  @media (max-width: 768px) {
    .nav-links {
      display: none;
      flex-direction: column;
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: #0f172a;
      padding: 1rem 2rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .nav-links.active {
      display: flex;
    }
    .hamburger {
      display: block;
    }
  }
`;

const js = `
  document.addEventListener('DOMContentLoaded', () => {
    // Mobile Navigation Toggle
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('nav-links');
    if (hamburger && navLinks) {
      hamburger.addEventListener('click', () => {
        const isActive = navLinks.classList.toggle('active');
        hamburger.setAttribute('aria-expanded', isActive ? 'true' : 'false');
      });
    }

    // Contact Form Handler
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
      contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('contact-name');
        const emailInput = document.getElementById('contact-email');
        const messageInput = document.getElementById('contact-message');
        const nameError = document.getElementById('name-error');
        const emailError = document.getElementById('email-error');
        const messageError = document.getElementById('message-error');
        const statusDiv = document.getElementById('contact-status');
        const submitBtn = document.getElementById('contact-submit');

        // Reset errors
        nameError.textContent = '';
        emailError.textContent = '';
        messageError.textContent = '';
        statusDiv.style.display = 'none';
        statusDiv.className = '';

        let valid = true;
        if (!nameInput.value.trim()) {
          nameError.textContent = 'Name is required.';
          valid = false;
        }
        if (!emailInput.value.trim()) {
          emailError.textContent = 'Email is required.';
          valid = false;
        } else if (!emailInput.value.includes('@')) {
          emailError.textContent = 'Invalid email format.';
          valid = false;
        }
        if (!messageInput.value.trim()) {
          messageError.textContent = 'Message is required.';
          valid = false;
        }

        if (!valid) return;

        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';

        try {
          const pageParams = new URLSearchParams(window.location.search);
          const statusParam = pageParams.get('status') || '';
          const apiUrl = statusParam ? \`/api/contact?status=\${statusParam}\` : '/api/contact';

          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: nameInput.value,
              email: emailInput.value,
              message: messageInput.value
            })
          });

          const data = await response.json();
          if (response.ok) {
            statusDiv.textContent = data.message || 'Message sent successfully!';
            statusDiv.className = 'success';
            statusDiv.style.display = 'block';
            contactForm.reset();
          } else {
            statusDiv.textContent = data.error || 'Something went wrong.';
            statusDiv.className = 'error';
            statusDiv.style.display = 'block';
          }
        } catch (err) {
          statusDiv.textContent = 'Network error. Please try again.';
          statusDiv.className = 'error';
          statusDiv.style.display = 'block';
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      });
    }
  });
`;

function getPage(title, content, activeNav = '') {
  const getActiveClass = (nav) => activeNav === nav ? 'class="active"' : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Alkamfrz Portfolio</title>
  <style>${css}</style>
</head>
<body>
  <header class="header">
    <nav class="navbar">
      <a href="/" class="logo" id="logo-link">Alkamfrz</a>
      <div class="nav-links" id="nav-links">
        <a href="/" id="nav-home" ${getActiveClass('home')}>Home</a>
        <a href="/projects" id="nav-projects" ${getActiveClass('projects')}>Projects</a>
        <a href="/blog" id="nav-blog" ${getActiveClass('blog')}>Blog</a>
      </div>
      <button class="hamburger" id="hamburger" aria-expanded="false" aria-label="Menu">☰</button>
    </nav>
  </header>
  <main class="container">
    ${content}
  </main>
  <footer class="footer">
    <div class="social-links">
      <a href="https://github.com/alkamfrz" id="contact-github" target="_blank" rel="noopener noreferrer">GitHub</a>
      <a href="https://linkedin.com/in/alkamfrz" id="contact-linkedin" target="_blank" rel="noopener noreferrer">LinkedIn</a>
      <a href="mailto:alkamfrz@example.com" id="contact-email">Email</a>
    </div>
    <p>&copy; 2026 Alkamfrz. All rights reserved.</p>
  </footer>
  <script>${js}</script>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = url.pathname;
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }
  const searchParams = url.searchParams;

  // Handle Contact API Form POST endpoint
  if (pathname === '/api/contact' && req.method === 'POST') {
    const status = parseInt(searchParams.get('status') || '200', 10);
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      setTimeout(() => {
        res.setHeader('Content-Type', 'application/json');
      if (status !== 200) {
        res.statusCode = status;
        if (status === 429) {
          res.end(JSON.stringify({ error: 'Too many requests. Please wait before trying again.' }));
        } else {
          res.end(JSON.stringify({ error: 'Server error. Please try again later.' }));
        }
        return;
      }
      
      let data = {};
      try { data = JSON.parse(body); } catch(e) {}
      
      const { name, email, message } = data;
      if (!name || !email || !message || name.trim() === '' || email.trim() === '' || message.trim() === '') {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'All fields are required.' }));
        return;
      }
      if (!email.includes('@')) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid email format.' }));
        return;
      }
      
      res.statusCode = 200;
      res.end(JSON.stringify({ message: 'Message sent successfully!' }));
      }, 200);
    });
    return;
  }

  res.setHeader('Content-Type', 'text/html');

  if (pathname === '/' || pathname === '/index.html') {
    res.statusCode = 200;
    res.end(getPage('Home', `
      <div class="glass-card" id="welcome-card">
        <h1>Welcome to my Portfolio</h1>
        <p>I am a software engineer building robust infrastructure and applications.</p>
      </div>

      <div class="glass-card" id="blog-preview-section">
        <h2>Latest Blog Posts</h2>
        <div class="grid">
          <div class="glass-card blog-post-card" id="post-1">
            <h3>Setting up a Secure Home Server</h3>
            <small class="post-date">June 1, 2026</small>
            <p>Learn how to deploy secure Docker setups locally.</p>
            <a href="/blog/setting-up-a-secure-home-server" class="read-more">Read article &rarr;</a>
          </div>
          <div class="glass-card blog-post-card" id="post-2">
            <h3>Why I love Playwright for E2E Testing</h3>
            <small class="post-date">May 15, 2026</small>
            <p>Playwright brings speed and reliability to testing workflows.</p>
            <a href="/blog/why-i-love-playwright-for-e2e-testing" class="read-more">Read article &rarr;</a>
          </div>
        </div>
      </div>

      <div class="glass-card" id="contact-section">
        <h2>Contact Me</h2>
        <form id="contact-form" novalidate>
          <div class="form-group">
            <label for="contact-name">Name</label>
            <input type="text" id="contact-name" name="name" required />
            <span class="error-msg" id="name-error"></span>
          </div>
          <div class="form-group">
            <label for="contact-email">Email</label>
            <input type="email" id="contact-email" name="email" required />
            <span class="error-msg" id="email-error"></span>
          </div>
          <div class="form-group">
            <label for="contact-message">Message</label>
            <textarea id="contact-message" name="message" required></textarea>
            <span class="error-msg" id="message-error"></span>
          </div>
          <button type="submit" id="contact-submit" style="background-color: #38bdf8; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; color: #0f172a; font-weight: bold; cursor: pointer;">Submit</button>
          <div id="contact-status"></div>
        </form>
      </div>
    `, 'home'));

  } else if (pathname === '/projects') {
    res.statusCode = 200;
    const countParam = searchParams.get('count');
    const overflowParam = searchParams.get('overflow') === 'true';
    const missingLinksParam = searchParams.get('missingLinks') === 'true';

    let projectsHtml = '';
    const defaultCount = countParam !== null ? parseInt(countParam, 10) : 2;

    if (defaultCount === 0) {
      projectsHtml = '<p id="no-projects">No projects found</p>';
    } else {
      projectsHtml = '<div class="grid" id="projects-grid">';
      for (let i = 1; i <= defaultCount; i++) {
        const title = overflowParam ? 'A'.repeat(301) : i === 1 ? 'Home Server Infrastructure' : 'Portfolio Website';
        const desc = overflowParam ? 'B'.repeat(2001) : i === 1 ? 'Automated self-hosted home infrastructure using Docker, K3s, and Ansible.' : 'Playwright-based test automation framework for web applications.';
        
        projectsHtml += `
          <div class="glass-card project-card" id="project-${i}">
            <h3>${title}</h3>
            <p>${desc}</p>
            <div class="tags">
              <span class="tech-badge">Docker</span>
              <span class="tech-badge">Node.js</span>
            </div>
            ${missingLinksParam ? '' : `<a href="#" class="live-link" style="color: #38bdf8; text-decoration: none; margin-right: 1rem;">Live Demo</a>`}
            ${missingLinksParam ? '' : `<a href="#" class="github-link" style="color: #cbd5e1; text-decoration: none;">GitHub</a>`}
          </div>`;
      }
      projectsHtml += '</div>';
    }

    res.end(getPage('Projects', `
      <h1>My Projects</h1>
      ${projectsHtml}
    `, 'projects'));

  } else if (pathname === '/blog') {
    res.statusCode = 200;
    const countParam = searchParams.get('count');
    let blogHtml = '';
    const defaultCount = countParam !== null ? parseInt(countParam, 10) : 2;

    if (defaultCount === 0) {
      blogHtml = '<p id="no-posts">No posts found</p>';
    } else {
      blogHtml = '<div class="grid" id="blog-grid">';
      const posts = [
        { id: 1, title: 'Setting up a Secure Home Server', date: 'June 1, 2026', slug: 'setting-up-a-secure-home-server', summary: 'Learn how to deploy secure Docker setups locally.' },
        { id: 2, title: 'Why I love Playwright for E2E Testing', date: 'May 15, 2026', slug: 'why-i-love-playwright-for-e2e-testing', summary: 'Playwright brings speed and reliability to testing workflows.' },
        { id: 3, title: 'Introduction to Astro Framework', date: 'April 10, 2026', slug: 'intro-to-astro', summary: 'Astro allows shipping less client-side JS.' },
        { id: 4, title: 'Docker Containers 101', date: 'March 05, 2026', slug: 'docker-containers-101', summary: 'Get started with docker containers easily.' },
        { id: 5, title: 'Tailwind CSS Secrets', date: 'February 20, 2026', slug: 'tailwind-secrets', summary: 'Advanced Tailwind styling methodologies.' }
      ];
      
      const count = Math.min(defaultCount, posts.length);
      for (let i = 0; i < count; i++) {
        blogHtml += `
          <div class="glass-card blog-post-card" id="post-${posts[i].id}">
            <h3>${posts[i].title}</h3>
            <small class="post-date">${posts[i].date}</small>
            <p>${posts[i].summary}</p>
            <div class="tags">
              <span class="tech-badge">DevOps</span>
              <span class="tech-badge">Automation</span>
            </div>
            <a href="/blog/${posts[i].slug}" class="read-more" style="color: #38bdf8; text-decoration: none;">Read article &rarr;</a>
          </div>`;
      }
      blogHtml += '</div>';
    }

    res.end(getPage('Blog', `
      <h1>Blog Posts</h1>
      ${blogHtml}
    `, 'blog'));

  } else if (pathname.startsWith('/blog/')) {
    const slug = pathname.substring(6);
    const validSlugs = [
      'setting-up-a-secure-home-server', 
      'why-i-love-playwright-for-e2e-testing', 
      'intro-to-astro',
      'docker-containers-101',
      'tailwind-secrets'
    ];
    
    if (!validSlugs.includes(slug)) {
      res.statusCode = 404;
      res.end(getPage('404 Not Found', `
        <div class="glass-card" style="text-align: center;">
          <h1>404</h1>
          <p>The blog post you are looking for does not exist.</p>
          <a href="/blog">Back to Blog</a>
        </div>
      `));
      return;
    }

    res.statusCode = 200;
    const isCustomMarkdown = searchParams.get('markdown') === 'custom';

    let postTitle = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    let postContent = '';

    if (isCustomMarkdown) {
      postContent = `
        <div class="glass-card blog-post-detail">
          <h1>${postTitle}</h1>
          <p class="post-meta">Published on June 10, 2026 by Alkamfrz</p>
          <h2>Introduction to custom rendering</h2>
          <p>Here is some paragraph text demonstrating basic inline styling.</p>
          <blockquote>
            This is a blockquote element representing an important quote from a section.
          </blockquote>
          <h3>Here is a list:</h3>
          <ul>
            <li>Item A</li>
            <li>Item B</li>
            <li>Item C</li>
          </ul>
          <h3>Code Snippet:</h3>
          <pre><code>const a = 123;\nconsole.log(a);</code></pre>
          <h3>Media Image:</h3>
          <img src="/placeholder.jpg" alt="Demo Markdown Image" class="post-img" style="max-width:100%; border-radius:0.5rem;" />
        </div>
      `;
    } else {
      postContent = `
        <div class="glass-card blog-post-detail">
          <h1>${postTitle}</h1>
          <p class="post-meta">Published on June 1, 2026 by Alkamfrz</p>
          <p>This is the full article content for ${postTitle}. Built natively in the portfolio app.</p>
          <a href="/blog" style="color: #38bdf8; text-decoration: none;">&larr; Back to Blog</a>
        </div>
      `;
    }

    res.end(getPage(postTitle, postContent, 'blog'));

  } else {
    res.statusCode = 404;
    res.end(getPage('404 Not Found', `
      <div class="glass-card" style="text-align: center;" id="not-found-card">
        <h1>404</h1>
        <p>The page you are looking for does not exist.</p>
        <a href="/" id="go-home-link">Go Home</a>
      </div>
    `));
  }
});

server.listen(PORT, () => {
  console.log(`Mock server running on port ${PORT}`);
});
