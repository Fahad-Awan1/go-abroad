// Rule-based intent engine: keyword scoring + light fuzzy matching + entity
// extraction (country, visa type) with short conversational memory.
import { INTENTS, FAQ_ITEMS, COUNTRY_ALIASES, TYPE_ALIASES, TYPE_NAMES, byId, COUNTRY_CHIPS, DEFAULT_CHIPS, CONTACT } from './knowledge.js';
import { destinations } from '../data/destinations.js';

const STOP = new Set('a an the i me my we you your is are am be to of in on for at by with and or do does can could would should will what which how when where who why it this that there please pls plz tell about want need know get some any much many have has from into than then also just like visa visas'.split(' '));

export const normalize = (s) =>
  ` ${s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9%+\s-]/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim()} `;

function lev(a, b) {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

/** Score how well a keyword list matches the text. */
function score(text, tokens, keywords) {
  let s = 0;
  for (const k of keywords) {
    if (k.includes(' ')) {
      if (text.includes(` ${k} `)) s += 1.5 + k.split(' ').length * 0.25;
    } else if (tokens.includes(k)) {
      s += 1;
    } else if (k.length >= 5 && tokens.some((t) => t.length >= 4 && lev(t, k) <= 1)) {
      s += 0.7;
    }
  }
  return s;
}

function detect(aliases, text, tokens) {
  let best = null, bestScore = 0;
  for (const [id, words] of Object.entries(aliases)) {
    const sc = score(text, tokens, words);
    if (sc > bestScore) { best = id; bestScore = sc; }
  }
  return best;
}

const fmtList = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
const nameOf = (d) => d.short || d.name;

function countryOverview(d) {
  return {
    html: `${d.flag} <b>${d.name}</b> — ${d.summary}<br><br>We handle: ${d.types.map((t) => TYPE_NAMES[t]).join(', ')} visas. Processing is typically <b>${d.processing}</b>, and our packages start from <b>$${d.from}</b>. What are you planning?`,
    chips: COUNTRY_CHIPS(d.id),
  };
}

function countryType(d, type) {
  if (!d.visas[type] || !d.types.includes(type)) {
    const alt = destinations.filter((x) => x.types.includes(type)).map((x) => `${TYPE_NAMES[type]} in ${nameOf(x)}`).slice(0, 4);
    return {
      html: `${d.flag} For ${d.name}, ${TYPE_NAMES[type].toLowerCase()} routes are handled case by case — ${d.visas[type] || 'please speak to a counsellor for options.'}`,
      chips: [...alt, 'Book consultation'],
    };
  }
  return {
    html: `${d.flag} <b>${TYPE_NAMES[type]} visa — ${d.name}</b><br>${d.visas[type]}<br><br>⏱️ Typical processing: <b>${d.processing}</b><br>💼 Our package: from <b>$${d.from}</b><br><a href="/destinations.html#${d.id}">Full ${nameOf(d)} guide →</a>`,
    chips: [`Documents for ${nameOf(d)}`, `Fees for ${nameOf(d)}`, 'Book consultation'],
  };
}

const TYPE_OVERVIEW = {
  study: 'We take you from course shortlisting to admission, scholarships, SOP writing and the student visa itself. Popular choices:',
  work: 'We guide skilled workers through sponsored work permits, job-seeker visas and credential assessments. Popular routes:',
  visit: 'We build strong visit visa files — itinerary, cover letter, financial evidence and interview prep. Popular destinations:',
  pr: 'We assess your points, optimise your profile and manage PR applications end to end. Popular programmes:',
};

function typeOverview(type) {
  const ds = destinations.filter((d) => d.types.includes(type));
  return {
    html: `<b>${TYPE_NAMES[type]} visas</b><br>${TYPE_OVERVIEW[type]}${fmtList(ds.map((d) => `${d.flag} ${d.name} — ${d.processing}`))}Which country interests you?`,
    chips: ds.slice(0, 6).map((d) => `${type === 'pr' ? 'PR' : TYPE_NAMES[type]} in ${nameOf(d)}`),
  };
}

function faqMatch(tokens, min = 0.5) {
  const content = tokens.filter((t) => !STOP.has(t) && t.length > 2);
  if (content.length < 2) return null;
  let best = null, bestScore = 0;
  for (const f of FAQ_ITEMS) {
    const qTokens = normalize(f.q).trim().split(' ').filter((t) => !STOP.has(t) && t.length > 2);
    const hits = content.filter((t) => qTokens.some((q) => q === t || (t.length >= 5 && lev(q, t) <= 1))).length;
    const sc = hits / Math.max(3, qTokens.length);
    if (sc > bestScore) { best = f; bestScore = sc; }
  }
  return bestScore >= min ? best : null;
}

export function createEngine() {
  const ctx = { country: null, type: null, misses: 0 };

  return function reply(input) {
    const text = normalize(input);
    if (text.includes(' more questions ')) return { html: 'Here are some questions people often ask:', chips: MORE_QUESTIONS };
    const exact = FAQ_ITEMS.find((f) => normalize(f.q) === text);
    if (exact) return { html: exact.a, chips: ['Book consultation', 'More questions'] };
    // "contact us", "call us" etc. must not be read as USA
    const textForCountry = text.replace(/ (contact|call|email|reach|tell|about|with|join|message|text|help) us /g, ' $1 ');
    const tokens = text.trim().split(' ');
    const cTokens = textForCountry.trim().split(' ');

    const country = detect(COUNTRY_ALIASES, textForCountry, cTokens);
    const type = detect(TYPE_ALIASES, text, tokens);

    const scored = INTENTS.map((it) => ({ it, s: score(text, tokens, it.keywords) })).sort((a, b) => b.s - a.s);
    const top = scored[0].s >= 0.7 ? scored[0].it : null;
    const topic = top && ['fees', 'documents', 'processing'].includes(top.id) ? top.id : null;
    const short = tokens.filter((t) => !STOP.has(t)).length <= 3 && !/ (your|general|all) /.test(text);

    const d = country ? byId[country] : null;
    const ctxD = !d && ctx.country && short ? byId[ctx.country] : null;
    const target = d || ctxD;

    if (country) ctx.country = country;
    if (type) ctx.type = type;

    // 1. country-specific topic (fees / documents / processing)
    if (topic && target) {
      if (topic === 'fees') return { html: `${target.flag} Our <b>${target.name}</b> packages start from <b>$${target.from}</b> (embassy fees are separate and paid directly). The exact quote depends on the visa type and family size.`, chips: [`Documents for ${nameOf(target)}`, 'Book consultation'] };
      if (topic === 'documents') return { html: `${target.flag} Typical documents for <b>${target.name}</b>:${fmtList(target.requirements)}We'll give you a personalised checklist after assessment.`, chips: [`Fees for ${nameOf(target)}`, 'Book consultation'] };
      return { html: `${target.flag} <b>${target.name}</b> applications typically take <b>${target.processing}</b> to process. Seasonal peaks can add time, so apply early!`, chips: [`Documents for ${nameOf(target)}`, 'Book consultation'] };
    }

    // 2. country + visa type
    if (d && type) return countryType(d, type);
    if (d && !type && (!top || top.id === 'greeting' || top.id === 'eligibility')) return countryOverview(d);
    if (!d && type && ctxD && (!top || top.s < 1.5)) return countryType(ctxD, type);

    // 3. a close FAQ match beats generic intents
    const fq = !d && !type ? faqMatch(tokens, 0.6) : null;
    if (fq) return { html: fq.a, chips: ['Book consultation', 'More questions'] };

    // 3b. explicit intent
    if (top && !(type && top.s < 1)) {
      ctx.misses = 0;
      return { html: top.answer(), chips: top.chips };
    }

    // 4. visa type without country
    if (type) return typeOverview(type);
    if (d) return countryOverview(d);

    // 5. FAQ similarity
    const f = faqMatch(tokens);
    if (f) return { html: f.a, chips: ['Book consultation', 'More questions'] };

    // 6. fallback
    ctx.misses++;
    return {
      html: ctx.misses > 1
        ? `I'm still learning and couldn't find an answer to that. 🙏 A counsellor can help right away on <a href="${CONTACT.whatsapp}">WhatsApp</a> or <a href="${CONTACT.phoneHref}">${CONTACT.phone}</a> — or <a href="/contact.html">book a free consultation</a>.`
        : `Sorry, I didn't quite get that. Try asking something like <i>“student visa for Canada”</i>, <i>“Schengen documents”</i> or <i>“how much are your fees?”</i>`,
      chips: DEFAULT_CHIPS,
    };
  };
}

export const MORE_QUESTIONS = FAQ_ITEMS.slice(0, 6).map((f) => f.q);
