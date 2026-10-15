(() => {
  const form = document.querySelector('#project-form');
  if (!form) return;

  const steps = Array.from(form.querySelectorAll('.form-step'));
  const nextButton = document.querySelector('#next-step');
  const prevButton = document.querySelector('#prev-step');
  const submitButton = document.querySelector('#submit-brief');
  const countLabel = document.querySelector('#step-count');
  const percentLabel = document.querySelector('#step-percent');
  const fill = document.querySelector('#progress-fill');
  const progressLabels = Array.from(document.querySelectorAll('[data-progress-label]'));
  const errorBox = document.querySelector('#form-error');
  const draftStatus = document.querySelector('#draft-status');
  const fileInput = document.querySelector('#attachments');
  const fileList = document.querySelector('#file-list');
  const uploadSummary = document.querySelector('#upload-summary');
  const successPanel = document.querySelector('#success-panel');
  const successMessage = document.querySelector('#success-message');
  const reviewSummary = document.querySelector('#review-summary');
  const reviewAttachments = document.querySelector('#review-attachments');
  const downloadBriefButton = document.querySelector('#download-brief');
  const clearDraftButton = document.querySelector('#clear-draft');
  const MAX_BYTES = 10 * 1024 * 1024;
  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
  let currentStep = 0;
  let isSubmitting = false;
  let draftTimer;
  const DRAFT_KEY = 'cd-architectural-project-brief-v1';

  const scrollToForm = () => {
    const panel = document.querySelector('.form-panel');
    if (!panel) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    panel.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };

  const setError = (message) => {
    errorBox.textContent = message;
    errorBox.hidden = !message;
  };

  const updateProgress = () => {
    steps.forEach((step, index) => {
      const active = index === currentStep;
      step.hidden = !active;
      step.classList.toggle('is-active', active);
      step.setAttribute('aria-hidden', String(!active));
    });
    countLabel.textContent = `STEP ${String(currentStep + 1).padStart(2, '0')} OF ${String(steps.length).padStart(2, '0')}`;
    const percent = Math.round(((currentStep + 1) / steps.length) * 100);
    percentLabel.textContent = `${percent}% COMPLETE`;
    fill.style.width = `${percent}%`;
    fill.parentElement.setAttribute('aria-valuenow', String(percent));
    progressLabels.forEach((label, index) => {
      label.classList.toggle('active', index === currentStep);
      label.classList.toggle('done', index < currentStep);
      if (index === currentStep) label.setAttribute('aria-current', 'step');
      else label.removeAttribute('aria-current');
    });
    if (currentStep === steps.length - 1) renderReviewSummary();
    prevButton.hidden = currentStep === 0;
    nextButton.hidden = currentStep === steps.length - 1;
    submitButton.hidden = currentStep !== steps.length - 1;
    setError('');
  };

  const validateCurrentStep = () => {
    const fields = Array.from(steps[currentStep].querySelectorAll('input, select, textarea'));
    for (const field of fields) {
      if (field.disabled || field.type === 'file' || field.type === 'checkbox' || field.type === 'radio' || field.name === 'website') continue;
      if ((field.required || String(field.value || '').trim() !== '') && !field.checkValidity()) {
        field.reportValidity();
        field.focus({ preventScroll: false });
        return false;
      }
    }
    // Consent is required on the final step.
    if (currentStep === steps.length - 1) {
      const consent = document.querySelector('#consent');
      if (!consent.checked) {
        consent.focus();
        setError('Please confirm that C + D may use these details to review and respond to your project inquiry.');
        return false;
      }
    }
    return true;
  };

  const getFormValues = () => {
    const fd = new FormData(form);
    const output = {};
    for (const [key, value] of fd.entries()) {
      if (key === 'attachments' || key === 'website') continue;
      if (key === 'consent') { output[key] = value === 'yes'; continue; }
      if (Object.prototype.hasOwnProperty.call(output, key)) {
        if (!Array.isArray(output[key])) output[key] = [output[key]];
        output[key].push(value);
      } else {
        output[key] = value;
      }
    }
    return output;
  };

  const reviewGroups = [
    { title: 'Your details', step: 0, fields: [['name', 'Name'], ['email', 'Email'], ['phone', 'Mobile number'], ['contact_preference', 'Preferred contact'], ['project_type', 'Project type'], ['project_location', 'Project location']] },
    { title: 'The property', step: 1, fields: [['lot_area_sqm', 'Lot area'], ['lot_shape', 'Lot shape'], ['lot_width_m', 'Lot frontage'], ['lot_depth_m', 'Lot depth'], ['storeys', 'Storeys'], ['target_floor_area_sqm', 'Target floor area'], ['site_conditions', 'Site conditions'], ['site_notes', 'Site notes']] },
    { title: 'Spaces you need', step: 2, fields: [['spaces', 'Required spaces'], ['bedrooms', 'Bedrooms'], ['bathrooms', 'Bathrooms'], ['other_spaces', 'Other space details']] },
    { title: 'Design direction', step: 3, fields: [['style_preferences', 'Styles'], ['construction_budget', 'Construction budget'], ['target_timeline', 'Target timeline'], ['priorities', 'Design priorities'], ['vision_notes', 'Additional notes']] }
  ];
  const prettyValue = (value, key) => {
    if (Array.isArray(value)) return value.join(', ');
    if (value === undefined || value === null || String(value).trim() === '') return '';
    if (['lot_area_sqm', 'target_floor_area_sqm'].includes(key)) return `${value} m²`;
    if (['lot_width_m', 'lot_depth_m'].includes(key)) return `${value} m`;
    return String(value);
  };
  const renderReviewSummary = () => {
    if (!reviewSummary) return;
    const values = getFormValues();
    reviewSummary.replaceChildren();
    reviewGroups.forEach((group) => {
      const card = document.createElement('section');
      card.className = 'review-card';
      const head = document.createElement('div');
      head.className = 'review-card-head';
      const title = document.createElement('h3');
      title.textContent = group.title;
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'review-edit';
      edit.dataset.goStep = String(group.step);
      edit.textContent = 'Edit';
      head.append(title, edit);
      const list = document.createElement('dl');
      list.className = 'review-fields';
      let entries = 0;
      group.fields.forEach(([key, label]) => {
        const value = prettyValue(values[key], key);
        if (!value) return;
        const wrap = document.createElement('div');
        const term = document.createElement('dt');
        const detail = document.createElement('dd');
        term.textContent = label;
        detail.textContent = value;
        wrap.append(term, detail);
        list.append(wrap);
        entries += 1;
      });
      if (!entries) {
        const empty = document.createElement('p');
        empty.className = 'review-empty';
        empty.textContent = 'No optional details added yet.';
        list.append(empty);
      }
      card.append(head, list);
      reviewSummary.append(card);
    });
    const selectedFiles = Array.from(fileInput.files || []);
    if (reviewAttachments) {
      const title = reviewAttachments.querySelector('strong');
      reviewAttachments.replaceChildren();
      if (title) reviewAttachments.append(title);
      else {
        const newTitle = document.createElement('strong');
        newTitle.textContent = 'Attached references';
        reviewAttachments.append(newTitle);
      }
      if (selectedFiles.length) {
        const list = document.createElement('ul');
        selectedFiles.forEach((file) => {
          const item = document.createElement('li');
          item.textContent = `${file.name} (${file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`})`;
          list.append(item);
        });
        reviewAttachments.append(list);
      } else {
        const note = document.createElement('p');
        note.textContent = 'No files selected. You can still submit the brief without attachments.';
        reviewAttachments.append(note);
      }
    }
  };

  const createBriefCopy = () => {
    const values = getFormValues();
    const lines = [
      'C + D ARCHITECTURAL DESIGN SERVICES',
      'CLIENT PROJECT BRIEF',
      `Prepared on: ${new Date().toLocaleDateString()}`,
      '',
      'This is a copy of the information entered in the inquiry form. It is not a quotation or a project agreement.',
      ''
    ];
    reviewGroups.forEach((group) => {
      lines.push(group.title.toUpperCase());
      group.fields.forEach(([key, label]) => {
        const value = prettyValue(values[key], key);
        if (value) lines.push(`${label}: ${value}`);
      });
      lines.push('');
    });
    const selectedFiles = Array.from(fileInput.files || []);
    lines.push('ATTACHED REFERENCES');
    if (selectedFiles.length) selectedFiles.forEach((file) => lines.push(`- ${file.name} (${formatFileSize(file.size)})`));
    else lines.push('- No files selected');
    lines.push('', 'Note: the text copy lists attachment names only. It does not contain the actual files.');
    return lines.join('\n');
  };

  if (downloadBriefButton) {
    downloadBriefButton.addEventListener('click', () => {
      try {
        const blob = new Blob([createBriefCopy()], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cd-project-brief-${new Date().toISOString().slice(0, 10)}.txt`;
        link.hidden = true;
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (_) {
        setError('Your browser could not create a local copy. You can still review your details here before submitting.');
      }
    });
  }

  const saveDraft = () => {
    try {
      const draft = getFormValues();
      delete draft.consent; // Consent must be affirmative at the time of submission, not restored from a draft.
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      draftStatus.textContent = 'Draft saved in this browser session; uploads are not saved.';
    } catch (_) {
      draftStatus.textContent = 'Your browser could not save this draft; please keep this tab open.';
    }
  };

  const restoreDraft = () => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      for (const [name, value] of Object.entries(saved)) {
        if (name === 'consent') continue;
        const fields = Array.from(form.querySelectorAll(`[name="${CSS.escape(name)}"]`));
        if (!fields.length) continue;
        if (Array.isArray(value)) {
          fields.forEach((field) => { if (field.type === 'checkbox' || field.type === 'radio') field.checked = value.includes(field.value); });
        } else {
          fields.forEach((field) => {
            if (field.type === 'checkbox' || field.type === 'radio') field.checked = String(field.value) === String(value);
            else if (field.type !== 'file' && field.type !== 'hidden') field.value = value;
          });
        }
      }
      draftStatus.textContent = 'Saved draft restored. Please re-attach your files; uploads are not saved.';
    } catch (_) {
      draftStatus.textContent = 'Start your brief below.';
    }
  };

  const validateFiles = () => {
    const files = Array.from(fileInput.files || []);
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (files.length > 12) {
      setError('Please upload no more than 12 files. Remove the extra files below to continue.');
      return false;
    }
    if (files.some((file) => file.size === 0)) {
      setError('One of the selected files is empty or unreadable. Remove it or choose another file.');
      return false;
    }
    if (files.some((file) => !allowedTypes.has(file.type) && !(!file.type && /\.(jpe?g|png|webp|pdf)$/i.test(file.name)))) {
      setError('One or more files use an unsupported format. Please use JPG, PNG, WEBP, or PDF files, then remove any unsupported files below.');
      return false;
    }
    if (totalBytes > MAX_BYTES) {
      setError('Your files are larger than 10 MB in total. Remove one or more files or choose smaller versions.');
      return false;
    }
    return true;
  };

  const formatFileSize = (bytes) => bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  const removeFile = (removeIndex) => {
    const currentFiles = Array.from(fileInput.files || []);
    if (!currentFiles[removeIndex]) return;
    if (typeof DataTransfer === 'undefined') {
      setError('This browser cannot remove one attachment at a time. Re-select the files you want to keep.');
      return;
    }
    const transfer = new DataTransfer();
    currentFiles.forEach((file, index) => { if (index !== removeIndex) transfer.items.add(file); });
    fileInput.files = transfer.files;
    setError('');
    renderFiles();
    renderReviewSummary();
    saveDraft();
  };

  const renderFiles = () => {
    const selectedFiles = Array.from(fileInput.files || []);
    fileList.replaceChildren();
    selectedFiles.forEach((file, index) => {
      const item = document.createElement('li');
      item.className = 'file-item';
      const name = document.createElement('span');
      name.className = 'file-name';
      name.textContent = file.name;
      const size = document.createElement('small');
      size.className = 'file-size';
      size.textContent = formatFileSize(file.size);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'file-remove';
      remove.textContent = 'Remove';
      remove.setAttribute('aria-label', `Remove attachment ${file.name}`);
      remove.addEventListener('click', () => removeFile(index));
      item.append(name, size, remove);
      fileList.append(item);
    });
    if (uploadSummary) {
      const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
      uploadSummary.textContent = selectedFiles.length
        ? `${selectedFiles.length} ${selectedFiles.length === 1 ? 'file' : 'files'} selected · ${formatFileSize(totalBytes)} of 10 MB`
        : 'No files selected. You can submit the brief without attachments.';
    }
  };

  const readPrefill = () => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    const select = document.querySelector('#project-type');
    const options = {
      'new-home': 'New home',
      renovation: 'Renovation',
      'space-planning': 'Interior / space planning',
      consultation: 'Concept consultation'
    };
    if (type && select && options[type]) select.value = options[type];
    if (params.get('source') !== 'home-builder') return;
    try {
      const saved = sessionStorage.getItem('cd-home-builder-concept-v1');
      if (!saved) return;
      const concept = JSON.parse(saved);
      const setValue = (selector, value) => {
        const field = document.querySelector(selector);
        if (!field || value === undefined || value === null || String(value).trim() === '') return;
        field.value = String(value);
        field.dispatchEvent(new Event('input', { bubbles: true }));
      };
      setValue('#lot-area', concept.lotArea);
      setValue('#storeys', concept.storeys);
      setValue('#floor-area', concept.floorArea);
      setValue('#vision-notes', concept.concept);
      const extraSpaces = document.querySelector('#other-spaces');
      if (extraSpaces && Array.isArray(concept.rooms)) extraSpaces.value = concept.rooms.join(', ');
      sessionStorage.removeItem('cd-home-builder-concept-v1');
    } catch (_) { /* Manual project brief remains available if prefill fails. */ }
  };

  nextButton.addEventListener('click', () => {
    if (!validateCurrentStep()) return;
    if (currentStep === 3 && !validateFiles()) {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      fileList.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      return;
    }
    saveDraft();
    currentStep = Math.min(currentStep + 1, steps.length - 1);
    updateProgress();
    scrollToForm();
    const heading = steps[currentStep].querySelector('h2');
    if (heading) heading.setAttribute('tabindex', '-1'), heading.focus({ preventScroll: true });
  });

  prevButton.addEventListener('click', () => {
    currentStep = Math.max(currentStep - 1, 0);
    updateProgress();
    scrollToForm();
  });

  form.addEventListener('input', () => {
    window.clearTimeout(draftTimer);
    draftStatus.textContent = 'Saving draft…';
    draftTimer = window.setTimeout(saveDraft, 350);
  });
  form.addEventListener('change', () => {
    window.clearTimeout(draftTimer);
    saveDraft();
  });
  fileInput.addEventListener('change', () => {
    setError('');
    validateFiles();
    renderFiles();
  });

  const uploadDrop = form.querySelector('.upload-drop');
  if (uploadDrop) {
    uploadDrop.addEventListener('dragover', (event) => {
      if (!event.dataTransfer || !Array.from(event.dataTransfer.types || []).includes('Files')) return;
      event.preventDefault();
      uploadDrop.classList.add('is-dragging');
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    });
    uploadDrop.addEventListener('dragleave', (event) => {
      if (!uploadDrop.contains(event.relatedTarget)) uploadDrop.classList.remove('is-dragging');
    });
    uploadDrop.addEventListener('drop', (event) => {
      if (!event.dataTransfer || !event.dataTransfer.files?.length) return;
      event.preventDefault();
      uploadDrop.classList.remove('is-dragging');
      if (typeof DataTransfer === 'undefined') {
        setError('Drag-and-drop is not supported by this browser. Please use Choose files to upload.');
        return;
      }
      const transfer = new DataTransfer();
      Array.from(fileInput.files || []).forEach((file) => transfer.items.add(file));
      Array.from(event.dataTransfer.files).forEach((file) => transfer.items.add(file));
      fileInput.files = transfer.files;
      setError('');
      validateFiles();
      renderFiles();
      renderReviewSummary();
      saveDraft();
    });
  }

  if (reviewSummary) {
    reviewSummary.addEventListener('click', (event) => {
      const edit = event.target.closest('[data-go-step]');
      if (!edit) return;
      const targetStep = Number(edit.dataset.goStep);
      if (!Number.isInteger(targetStep) || targetStep < 0 || targetStep >= steps.length - 1) return;
      currentStep = targetStep;
      updateProgress();
      scrollToForm();
      const heading = steps[currentStep].querySelector('h2');
      if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
    });
  }

  if (clearDraftButton) {
    clearDraftButton.addEventListener('click', () => {
      const shouldClear = window.confirm('Clear this project brief and remove its saved draft from this browser session?');
      if (!shouldClear) return;
      window.clearTimeout(draftTimer);
      form.reset();
      fileInput.value = '';
      try { sessionStorage.removeItem(DRAFT_KEY); } catch (_) { /* Storage is optional. */ }
      readPrefill();
      currentStep = 0;
      updateProgress();
      renderFiles();
      setError('');
      draftStatus.textContent = 'Draft cleared. Start again whenever you are ready.';
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    // Walk through every step so browser focus and inline validation stay predictable.
    for (let index = 0; index < steps.length; index += 1) {
      currentStep = index;
      updateProgress();
      if (!validateCurrentStep()) {
        scrollToForm();
        const invalid = steps[index].querySelector(':invalid');
        if (invalid) invalid.focus({ preventScroll: false });
        return;
      }
    }
    if (!validateFiles()) return;

    isSubmitting = true;
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="button-spinner" aria-hidden="true"></span> Sending brief…';
    setError('');

    const payload = getFormValues();
    const body = new FormData();
    body.append('submission', JSON.stringify(payload));
    const botField = form.querySelector('[name="website"]');
    body.append('website', botField ? botField.value : '');
    Array.from(fileInput.files || []).forEach((file) => body.append('attachments', file, file.name));

    try {
      const response = await fetch('/api/submit', { method: 'POST', body });
      let result = {};
      try { result = await response.json(); } catch (_) { /* Show a helpful fallback below. */ }
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'The brief could not be submitted right now. Please try again in a moment.');
      }
      form.hidden = true;
      document.querySelector('.form-progress').hidden = true;
      successPanel.hidden = false;
      successMessage.textContent = result.localDemo
        ? 'Local demo only: this brief was saved on this computer for testing. It has not been sent to C + D or emailed to anyone.'
        : result.notificationSent === false
          ? 'Your brief has been saved, but the studio notification could not be confirmed. Please contact C + D directly to verify receipt.'
          : 'Thank you. Your project brief has been received. C + D can now review your notes and references.';
      try { sessionStorage.removeItem(DRAFT_KEY); } catch (_) { /* Storage is optional. */ }
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      successPanel.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    } catch (error) {
      setError(`${error.message} If this website has just been installed, the submission service may not be connected yet.`);
      errorBox.setAttribute('tabindex', '-1');
      errorBox.focus({ preventScroll: true });
      errorBox.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      submitButton.disabled = false;
      submitButton.innerHTML = 'Send project brief <span aria-hidden="true">↗</span>';
    } finally {
      isSubmitting = false;
    }
  });

  readPrefill();
  restoreDraft();
  renderFiles();
  updateProgress();
})();
