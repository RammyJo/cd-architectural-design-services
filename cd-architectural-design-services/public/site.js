(() => {
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#primary-nav');
  const navWrap = document.querySelector('.nav-wrap');
  const closeMenu = () => {
    if (!menuToggle || !nav) return;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
    nav.classList.remove('is-open');
    document.body.classList.remove('menu-open');
  };
  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
      const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
      if (expanded) {
        closeMenu();
      } else {
        menuToggle.setAttribute('aria-expanded', 'true');
        menuToggle.setAttribute('aria-label', 'Close navigation');
        nav.classList.add('is-open');
        document.body.classList.add('menu-open');
        const firstLink = nav.querySelector('a');
        if (firstLink && window.matchMedia('(max-width: 1050px)').matches) firstLink.focus({ preventScroll: true });
      }
    });
    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        menuToggle.focus({ preventScroll: true });
      }
    });
    document.addEventListener('click', (event) => {
      if (menuToggle.getAttribute('aria-expanded') === 'true' && navWrap && !navWrap.contains(event.target)) closeMenu();
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1050) closeMenu();
    }, { passive: true });
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
  referenceImages.forEach((img) => { img.decoding = 'async'; });
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

  // Provide a composed fallback if an external reference image cannot load.
  document.querySelectorAll('.hero-image-frame img, .direction-card img').forEach((img) => {
    img.addEventListener('error', () => {
      const frame = img.closest('.hero-image-frame, .direction-card');
      if (!frame) return;
      frame.classList.add('image-unavailable');
      frame.dataset.imageFallback = img.closest('.direction-card')?.querySelector('h3')?.textContent || 'Architectural design inspiration';
    }, { once: true });
  });

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

  // Keep the studio's main information on separate pages, with a clear next step.
  const pageSequence = [
    { file: 'index.html', title: 'Home', description: 'Meet the studio and its design philosophy.' },
    { file: 'approach.html', title: 'Our approach', description: 'See how the project conversation begins.' },
    { file: 'services.html', title: 'Services', description: 'Explore the kinds of work the studio discusses.' },
    { file: 'design-directions.html', title: 'Design directions', description: 'Browse illustrative ideas for mood, form, and materials.' },
    { file: 'process.html', title: 'Process', description: 'Understand the first steps from idea to project scope.' },
    { file: 'faq.html', title: 'FAQ', description: 'Find answers to common questions before reaching out.' },
    { file: 'contact.html', title: 'Contact', description: 'Review how to get in touch and prepare an inquiry.' },
    { file: 'project-brief.html', title: 'Start a project', description: 'Build a project brief one step at a time.' }
  ];
  const currentFile = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

  // Highlight the current destination in the desktop/mobile menu where it exists.
  document.querySelectorAll('.primary-nav a[href]').forEach((link) => {
    try {
      const targetFile = (new URL(link.getAttribute('href'), window.location.href).pathname.split('/').pop() || 'index.html').toLowerCase();
      if (targetFile === currentFile) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    } catch (_) { /* Ignore a malformed optional navigation URL. */ }
  });

  const sequenceIndex = pageSequence.findIndex((page) => page.file === currentFile);
  const siteFooter = document.querySelector('.site-footer');
  if (sequenceIndex >= 0 && siteFooter && !document.querySelector('.page-sequence-nav')) {
    const sequenceNav = document.createElement('nav');
    sequenceNav.className = 'page-sequence-nav';
    sequenceNav.setAttribute('aria-label', 'Previous and next pages');

    const top = document.createElement('div');
    top.className = 'page-sequence-top';
    const meta = document.createElement('p');
    meta.className = 'page-sequence-meta';
    meta.textContent = `PAGE ${String(sequenceIndex + 1).padStart(2, '0')} / ${String(pageSequence.length).padStart(2, '0')}`;
    const current = document.createElement('p');
    current.className = 'page-sequence-current';
    current.textContent = pageSequence[sequenceIndex].title;
    top.append(meta, current);

    const progressTrack = document.createElement('div');
    progressTrack.className = 'page-sequence-progress';
    progressTrack.setAttribute('aria-hidden', 'true');
    const progressFill = document.createElement('span');
    progressFill.style.width = `${((sequenceIndex + 1) / pageSequence.length) * 100}%`;
    progressTrack.append(progressFill);

    const links = document.createElement('div');
    links.className = 'page-sequence-links';

    const makePageLink = (page, direction) => {
      const link = document.createElement('a');
      link.href = page.file;
      link.className = direction === 'next' ? 'page-sequence-next' : 'page-sequence-prev';
      link.setAttribute('aria-label', `${direction === 'next' ? 'Next page' : 'Previous page'}: ${page.title}`);
      const arrow = document.createElement('span');
      arrow.className = 'page-sequence-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = direction === 'next' ? '→' : '←';
      const copy = document.createElement('span');
      copy.className = 'page-sequence-copy';
      const label = document.createElement('span');
      label.className = 'page-sequence-label';
      label.textContent = direction === 'next' ? 'NEXT PAGE' : 'PREVIOUS PAGE';
      const title = document.createElement('strong');
      title.className = 'page-sequence-title';
      title.textContent = page.title;
      copy.append(label, title);
      if (direction === 'next') link.append(copy, arrow);
      else link.append(arrow, copy);
      return link;
    };

    if (sequenceIndex > 0) {
      links.append(makePageLink(pageSequence[sequenceIndex - 1], 'previous'));
    } else {
      const startNote = document.createElement('p');
      startNote.className = 'page-sequence-note';
      startNote.textContent = 'You are at the beginning. Use the menu or continue to the next page.';
      links.append(startNote);
    }

    if (sequenceIndex < pageSequence.length - 1) {
      links.append(makePageLink(pageSequence[sequenceIndex + 1], 'next'));
    } else {
      const endNote = document.createElement('p');
      endNote.className = 'page-sequence-note is-end';
      endNote.append(document.createTextNode('You have reached the end of the guide. '));
      const homeLink = document.createElement('a');
      homeLink.href = 'index.html';
      homeLink.textContent = 'Return to home';
      endNote.append(homeLink);
      links.append(endNote);
    }

    sequenceNav.append(top, progressTrack, links);
    siteFooter.parentNode.insertBefore(sequenceNav, siteFooter);
  }

})();
