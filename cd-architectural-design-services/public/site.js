(() => {
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#primary-nav');
  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
      const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!expanded));
      menuToggle.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
      nav.classList.toggle('is-open', !expanded);
      document.body.classList.toggle('menu-open', !expanded);
    });
    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Open navigation');
      nav.classList.remove('is-open');
      document.body.classList.remove('menu-open');
    }));
  }
  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();

  // Business contact data is maintained separately so no unverified number or address is invented.
  const config = window.CD_SITE_CONFIG || {};
  const methods = document.querySelector('#contact-methods');
  const contactCopy = document.querySelector('.contact-card-copy');
  if (contactCopy && config.serviceArea) {
    contactCopy.textContent = `Serving ${String(config.serviceArea).trim()}. Use a contact channel below or send a project inquiry.`;
  }
  if (methods) {
    const available = [];
    if (config.email && String(config.email).includes('@')) available.push({ label: 'Email', value: String(config.email).trim(), href: `mailto:${String(config.email).trim()}` });
    if (config.phone) available.push({ label: 'Phone', value: String(config.phone).trim(), href: `tel:${String(config.phone).replace(/[^+0-9]/g, '')}` });
    if (config.whatsapp) {
      const digits = String(config.whatsapp).replace(/\D/g, '');
      if (digits) available.push({ label: 'WhatsApp', value: String(config.whatsapp).trim(), href: `https://wa.me/${digits}` });
    }
    for (const [label, key] of [['Facebook', 'facebook'], ['Instagram', 'instagram'], ['Book a consultation', 'bookingUrl']]) {
      if (!config[key]) continue;
      try {
        const url = new URL(String(config[key]));
        if (url.protocol === 'https:') available.push({ label, value: label === 'Facebook' ? 'Visit page' : label === 'Instagram' ? 'View profile' : 'Choose a time', href: url.href, external: true });
      } catch (_) { /* Ignore incomplete/unverified URLs. */ }
    }
    if (available.length) {
      methods.replaceChildren();
      available.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'contact-method';
        const label = document.createElement('span');
        label.textContent = item.label;
        const link = document.createElement('a');
        link.href = item.href;
        link.textContent = item.value;
        if (item.external) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
        row.append(label, link);
        methods.append(row);
      });
      if (contactCopy) contactCopy.textContent = config.serviceArea ? `Serving ${String(config.serviceArea).trim()}. Choose a channel below or send a project inquiry.` : 'Choose a contact channel below, or send a project inquiry.';
    }
    if (config.address) {
      const address = document.createElement('div');
      address.className = 'contact-card-note contact-address';
      const text = document.createElement('p');
      text.textContent = `Studio / business address: ${String(config.address).trim()}`;
      const map = document.createElement('a');
      map.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(config.address).trim())}`;
      map.target = '_blank';
      map.rel = 'noopener noreferrer';
      map.textContent = 'Open in Google Maps';
      address.append(text, map);
      methods.insertAdjacentElement('afterend', address);
    }
  }

  // Open reference photography in a small native dialog; completed C + D work is not implied.
  const referenceImages = document.querySelectorAll('.direction-card img');
  if (referenceImages.length && 'HTMLDialogElement' in window) {
    const dialog = document.createElement('dialog');
    dialog.className = 'image-lightbox';
    dialog.setAttribute('aria-label', 'Enlarged design reference');
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'lightbox-close';
    close.textContent = 'Close (Esc)';
    const figure = document.createElement('figure');
    const enlarged = document.createElement('img');
    const caption = document.createElement('figcaption');
    figure.append(enlarged, caption);
    dialog.append(close, figure);
    document.body.append(dialog);
    const closeDialog = () => { if (dialog.open) dialog.close(); };
    close.addEventListener('click', closeDialog);
    dialog.addEventListener('click', (event) => { if (event.target === dialog) closeDialog(); });
    referenceImages.forEach((img) => {
      img.tabIndex = 0;
      img.setAttribute('role', 'button');
      img.setAttribute('aria-haspopup', 'dialog');
      img.setAttribute('aria-label', `Enlarge design reference: ${img.alt}`);
      const openImage = () => {
        enlarged.src = img.currentSrc || img.src;
        enlarged.alt = img.alt;
        caption.textContent = `${img.closest('.direction-card')?.querySelector('h3')?.textContent || 'Design reference'} — illustrative inspiration, not a confirmed C + D project.`;
        dialog.showModal();
        close.focus();
      };
      img.addEventListener('click', openImage);
      img.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openImage(); }
      });
    });
  }

  const revealTargets = document.querySelectorAll('.service-card, .direction-card, .process-step');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver((entries, activeObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          activeObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealTargets.forEach((target) => { target.classList.add('will-reveal'); observer.observe(target); });
  }
})();
