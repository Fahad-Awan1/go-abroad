// Build-time HTML renderers, invoked from vite.config.js via <!-- @render name -->.
import { destinations, services } from './destinations.js';
import { faqs } from './faqs.js';
import { icons } from './icons.js';
import { PLANE_SVG } from '../journey/plane.js';

const TYPE_LABEL = { study: 'Study', work: 'Work', visit: 'Visit', pr: 'PR' };

export function img(name, widths, { sizes = '100vw', alt = '', cls = '', eager = false } = {}) {
  const srcset = widths.map((w) => `/img/${name}-${w}.webp ${w}w`).join(', ');
  const w = widths[widths.length - 1];
  return `<img class="${cls}" src="/img/${name}-${widths[0]}.webp" srcset="${srcset}" sizes="${sizes}" alt="${alt}" ${
    eager ? 'fetchpriority="high"' : 'loading="lazy"'
  } decoding="async" width="${w}" height="${Math.round(w * 0.75)}">`;
}

const destCard = (d) => `
  <a class="dest-card" href="/destinations.html#${d.id}" data-cursor="View" draggable="false">
    <div class="dest-card__media">${img(d.img, [480, 960], { sizes: '(max-width: 600px) 72vw, 300px', alt: d.place })}</div>
    <div class="dest-card__body">
      <div>
        <h3 class="dest-card__title">${d.name}</h3>
        <p class="dest-card__place">${d.place}</p>
      </div>
      <span class="dest-card__chip">${icons.plane}<span>from $${d.from}</span></span>
    </div>
  </a>`;

const blocks = {
  'destination-cards': () => destinations.map(destCard).join(''),

  'destinations-grid': () =>
    destinations
      .map(
        (d) => `
  <article class="dest-tile reveal-up" id="${d.id}" data-types="${d.types.join(' ')}">
    <div class="dest-tile__media img-reveal">${img(d.img, [480, 960], { sizes: '(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw', alt: d.place })}
      <span class="dest-tile__flag" aria-hidden="true">${d.flag}</span>
    </div>
    <div class="dest-tile__body">
      <div class="dest-tile__head">
        <h3>${d.name}</h3>
        <span class="tag">${icons.clock} ${d.processing}</span>
      </div>
      <p class="muted">${d.summary}</p>
      <ul class="pill-row" aria-label="Visa types">${d.types.map((t) => `<li class="pill pill--${t}">${TYPE_LABEL[t]}</li>`).join('')}</ul>
      <details class="dest-tile__more">
        <summary>Visa details & requirements ${icons.chevDown}</summary>
        <div class="dest-tile__detail">
          <dl>${d.types.map((t) => `<dt>${TYPE_LABEL[t]} visa</dt><dd>${d.visas[t]}</dd>`).join('')}</dl>
          <h4>Typical documents</h4>
          <ul class="checklist">${d.requirements.map((r) => `<li>${icons.check}${r}</li>`).join('')}</ul>
          <div class="dest-tile__cta">
            <span class="price">Packages from <strong>$${d.from}</strong></span>
            <a class="btn btn--primary btn--sm" href="/contact.html?destination=${d.id}">Free assessment ${icons.arrow}</a>
          </div>
        </div>
      </details>
    </div>
  </article>`
      )
      .join(''),

  'services-cards': () =>
    services
      .map(
        (s, i) => `
  <a class="service-card fx-card tone-${(i % 6) + 1}" href="/services.html#${s.id}">
    <span class="fx-card__blob" aria-hidden="true"></span>
    <span class="fx-card__num" aria-hidden="true">0${i + 1}</span>
    <span class="fx-card__icon">${icons[s.icon]}</span>
    <h3>${s.title}</h3>
    <p>${s.blurb}</p>
    <span class="fx-card__link">Learn more <span class="fx-card__arrow">${icons.arrowUpRight}</span></span>
  </a>`
      )
      .join(''),

  'faq-list': () =>
    faqs
      .map(
        (g) => `
  <section class="faq-group reveal-up" aria-labelledby="faq-${g.cat.replace(/\W+/g, '-').toLowerCase()}">
    <h2 class="faq-group__title" id="faq-${g.cat.replace(/\W+/g, '-').toLowerCase()}">${g.cat}</h2>
    ${g.items
      .map(
        (f) => `<details class="faq">
      <summary><span>${f.q}</span><span class="faq__icon">${icons.plus}</span></summary>
      <div class="faq__a"><p>${f.a}</p></div>
    </details>`
      )
      .join('')}
  </section>`
      )
      .join(''),

  'destination-options': () => destinations.map((d) => `<option value="${d.id}">${d.name}</option>`).join(''),

  'filter-chips': () =>
    ['all', 'study', 'work', 'visit', 'pr']
      .map(
        (t, i) =>
          `<button class="chip${i === 0 ? ' is-active' : ''}" type="button" data-filter="${t}" aria-pressed="${i === 0}">${
            t === 'all' ? 'All destinations' : TYPE_LABEL[t]
          }</button>`
      )
      .join(''),

  'faq-schema': () => {
    const entities = faqs.flatMap((g) => g.items).map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    }));
    return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: entities })}</script>`;
  },
};

// Icons can be dropped into HTML with <!-- @render icon-plane -->
export function renderBlock(name) {
  if (name === 'plane-top') return PLANE_SVG;
  if (name.startsWith('icon-')) {
    const key = name.slice(5).replace(/-(\w)/g, (_, c) => c.toUpperCase());
    return icons[key] || '';
  }
  if (!blocks[name]) throw new Error(`Unknown render block: ${name}`);
  return blocks[name]();
}
