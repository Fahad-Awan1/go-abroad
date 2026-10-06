import { gsap, ScrollTrigger, reducedMotion } from './anim/scroll.js';

const TYPE_TEXT = { study: 'Study', work: 'Work', visit: 'Visit', pr: 'PR' };

/* Home hero "find your visa" form: answers instantly in the chatbot. */
export function initVisaSearch(getChat) {
  const form = document.querySelector('[data-visa-search]');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const dest = form.querySelector('[name="destination"] option:checked')?.textContent || '';
    const chat = await getChat();
    chat.ask(`${TYPE_TEXT[data.get('type')]} visa for ${dest}`);
  });
}

/* Contact page consultation form: client-side validation + success state. */
export function initContactForm() {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;
  const params = new URLSearchParams(location.search);
  const dest = params.get('destination');
  const service = params.get('service');
  const destEl = form.elements.namedItem('destination');
  const serviceEl = form.elements.namedItem('service');
  if (dest && destEl) destEl.value = dest;
  if (service && serviceEl) serviceEl.value = service;

  const rules = {
    name: (v) => (v.trim().length >= 2 ? '' : 'Please enter your full name.'),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Please enter a valid email address.'),
    phone: (v) => (v.replace(/[^\d]/g, '').length >= 10 ? '' : 'Please enter a valid phone number (with country code).'),
    service: (v) => (v ? '' : 'Please choose a visa type.'),
    consent: (_, el) => (el.checked ? '' : 'Please accept so we can contact you.'),
  };

  const check = (el) => {
    const rule = rules[el.name];
    if (!rule) return true;
    const msg = rule(el.value, el);
    const field = el.closest('.field, .consent');
    field?.classList.toggle('is-invalid', !!msg);
    const err = field?.querySelector('.field__error');
    if (err) err.textContent = msg;
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  };

  form.addEventListener('blur', (e) => { if (e.target.name in rules) check(e.target); }, true);
  form.addEventListener('input', (e) => {
    if (e.target.closest('.is-invalid')) check(e.target);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fields = [...form.elements].filter((el) => el.name in rules);
    const results = fields.map(check);
    const firstBad = fields[results.indexOf(false)];
    if (firstBad) { firstBad.focus(); return; }

    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.classList.add('is-loading');
    // Front-end only for now — plug in your form service / API here.
    setTimeout(() => {
      const success = form.parentElement.querySelector('[data-form-success]');
      const name = form.elements.namedItem('name').value.trim().split(' ')[0];
      success.querySelector('[data-success-name]').textContent = name;
      form.hidden = true;
      success.hidden = false;
      if (!reducedMotion) gsap.from(success.children, { y: 30, opacity: 0, stagger: 0.08, duration: 0.8, ease: 'power3.out' });
      success.focus();
      ScrollTrigger.refresh();
    }, 900);
  });
}

/* Destinations page filter chips. */
export function initDestinationFilter() {
  const chips = document.querySelectorAll('[data-filter]');
  const tiles = [...document.querySelectorAll('[data-types]')];
  if (!chips.length) return;
  const count = document.querySelector('[data-filter-count]');
  chips.forEach((chip) => chip.addEventListener('click', () => {
    const f = chip.dataset.filter;
    chips.forEach((c) => { c.classList.toggle('is-active', c === chip); c.setAttribute('aria-pressed', String(c === chip)); });
    const show = tiles.filter((t) => f === 'all' || t.dataset.types.split(' ').includes(f));
    tiles.forEach((t) => {
      const on = show.includes(t);
      if (on && t.hidden) {
        t.hidden = false;
        if (!reducedMotion) gsap.fromTo(t, { opacity: 0, y: 30, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power3.out' });
      } else if (!on) {
        t.hidden = true;
      }
    });
    if (count) count.textContent = `${show.length} destination${show.length === 1 ? '' : 's'}`;
    ScrollTrigger.refresh();
  }));
}

/* Animated <details> (FAQ + destination details) and live FAQ search. */
export function initAccordions() {
  document.querySelectorAll('details.faq, details.dest-tile__more').forEach((d) => {
    const summary = d.querySelector('summary');
    const body = summary.nextElementSibling;
    summary.addEventListener('click', (e) => {
      if (reducedMotion) return;
      e.preventDefault();
      if (d.open) {
        gsap.to(body, { height: 0, opacity: 0, duration: 0.45, ease: 'power3.inOut', onComplete: () => { d.open = false; gsap.set(body, { clearProps: 'all' }); ScrollTrigger.refresh(); } });
      } else {
        d.open = true;
        gsap.fromTo(body, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.6, ease: 'power3.out', onComplete: () => { gsap.set(body, { clearProps: 'all' }); ScrollTrigger.refresh(); } });
      }
    });
  });

  const search = document.querySelector('[data-faq-search]');
  if (!search) return;
  const empty = document.querySelector('[data-faq-empty]');
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    let any = false;
    document.querySelectorAll('.faq-group').forEach((g) => {
      let groupAny = false;
      g.querySelectorAll('details.faq').forEach((d) => {
        const hit = !q || d.textContent.toLowerCase().includes(q);
        d.hidden = !hit;
        groupAny ||= hit;
      });
      g.hidden = !groupAny;
      any ||= groupAny;
    });
    empty.hidden = any;
    ScrollTrigger.refresh();
  });
}
