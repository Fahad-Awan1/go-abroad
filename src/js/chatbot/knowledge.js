// Hardcoded knowledge for the Go Abroad assistant. Answers are trusted HTML.
import { destinations } from '../data/destinations.js';
import { faqs } from '../data/faqs.js';

export const CONTACT = {
  phone: '+1 713 364-5155',
  phoneHref: 'tel:+17133645155',
  whatsapp: 'https://wa.me/17133645155',
  email: 'safersolutionllc@gmail.com',
  address: 'Office 12, Blue Area, Islamabad, Pakistan',
  hours: 'Monday–Saturday, 10:00–19:00',
};

// Synonyms that identify a destination in free text
export const COUNTRY_ALIASES = {
  canada: ['canada', 'canadian', 'toronto', 'vancouver', 'montreal', 'calgary'],
  uk: ['uk', 'britain', 'british', 'england', 'london', 'scotland', 'wales', 'united kingdom', 'manchester'],
  usa: ['usa', 'us', 'america', 'american', 'united states', 'states', 'new york', 'california', 'texas'],
  australia: ['australia', 'aus', 'aussie', 'sydney', 'melbourne', 'brisbane', 'perth', 'australian'],
  germany: ['germany', 'german', 'deutschland', 'berlin', 'munich', 'frankfurt'],
  schengen: ['schengen', 'europe', 'european', 'eu', 'france', 'paris', 'italy', 'spain', 'netherlands', 'greece', 'portugal', 'switzerland', 'austria', 'belgium', 'sweden'],
  'new-zealand': ['new zealand', 'nz', 'zealand', 'auckland', 'wellington', 'kiwi'],
  ireland: ['ireland', 'irish', 'dublin', 'cork'],
};

export const TYPE_ALIASES = {
  study: ['study', 'student', 'studies', 'studying', 'university', 'universities', 'college', 'admission', 'admissions', 'masters', 'master', 'bachelor', 'bachelors', 'degree', 'phd', 'course', 'intake', 'f1', 'cas', 'education'],
  work: ['work', 'job', 'jobs', 'employment', 'skilled', 'worker', 'career', 'blue card', 'h1b', 'lmia', 'opportunity card', 'sponsor', 'sponsorship', 'working'],
  visit: ['visit', 'visitor', 'tourist', 'tourism', 'holiday', 'vacation', 'travel', 'trip', 'tour', 'family visit', 'b1', 'b2', 'business trip', 'honeymoon'],
  pr: ['pr', 'immigration', 'immigrate', 'immigrant', 'permanent', 'residency', 'resident', 'settle', 'settlement', 'migrate', 'migration', 'express entry', 'crs', 'green card', 'pnp', 'subclass 189', 'subclass 190', 'citizenship'],
};

export const TYPE_NAMES = { study: 'Study', work: 'Work', visit: 'Visit', pr: 'Immigration / PR' };

export const byId = Object.fromEntries(destinations.map((d) => [d.id, d]));

const link = (href, text) => `<a href="${href}">${text}</a>`;
const list = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;

export const DEFAULT_CHIPS = ['Study visa', 'Work visa', 'Visit visa', 'Immigration / PR', 'Fees', 'Documents', 'Book consultation'];

// Topic intents: keywords (weighted by specificity) -> answer
export const INTENTS = [
  {
    id: 'greeting',
    keywords: ['hi', 'hello', 'hey', 'salam', 'assalam', 'assalamualaikum', 'aoa', 'salaam', 'good morning', 'good evening', 'good afternoon', 'hola', 'yo'],
    answer: () => `Hello! 👋 I'm Ava, the Go Abroad assistant. I can help with <b>study, work, visit and PR visas</b>, fees, documents and timelines. Where would you like to go?`,
    chips: ['Canada', 'UK', 'USA', 'Australia', 'Germany', 'Schengen'],
  },
  {
    id: 'thanks',
    keywords: ['thanks', 'thank', 'thx', 'shukriya', 'appreciate', 'great', 'awesome', 'perfect', 'helpful'],
    answer: () => `You're welcome! 😊 Anything else I can help you with? When you're ready, our counsellors can do a <b>free profile assessment</b>.`,
    chips: ['Book consultation', 'Contact details'],
  },
  {
    id: 'bye',
    keywords: ['bye', 'goodbye', 'see you', 'later', 'allah hafiz', 'khuda hafiz'],
    answer: () => `Safe travels! ✈️ You can reopen this chat anytime, or reach us on WhatsApp at ${link(CONTACT.whatsapp, CONTACT.phone)}.`,
  },
  {
    id: 'services',
    keywords: ['services', 'service', 'what do you do', 'offer', 'help with', 'provide'],
    answer: () => `We handle the full journey:${list(['🎓 Study visas & university admissions', '💼 Work visas & job-seeker routes', '🏝️ Visit / tourist visas', '🏡 Immigration & PR (Express Entry, Australian skilled migration)', '👨‍👩‍👧 Family & spouse visas', '📘 IELTS / PTE coaching'])}See ${link('/services.html', 'all services')}.`,
    chips: ['Study visa', 'Work visa', 'Visit visa', 'Immigration / PR'],
  },
  {
    id: 'fees',
    keywords: ['fee', 'fees', 'cost', 'costs', 'price', 'prices', 'pricing', 'charges', 'charge', 'how much', 'expensive', 'cheap', 'rate', 'package', 'payment', 'budget'],
    answer: () => `Our service packages start from:${list(destinations.map((d) => `${d.flag} ${d.name} — from <b>$${d.from}</b>`))}Embassy / government fees are separate and paid directly to the authority. You'll get a <b>written quote</b> after your free assessment.`,
    chips: ['Book consultation', 'Documents', 'Processing time'],
  },
  {
    id: 'documents',
    keywords: ['document', 'documents', 'docs', 'requirement', 'requirements', 'checklist', 'papers', 'paperwork', 'required', 'need to submit', 'bank statement', 'proof of funds'],
    answer: () => `Most visa files need:${list(['Valid passport & photos', 'Bank statements / proof of funds', 'Education or employment documents', 'English test result (IELTS / PTE) where required', 'Purpose letter — admission, invitation or job offer', 'Travel / health insurance for some visas'])}Tell me the country and I'll share its specific checklist.`,
    chips: ['Documents for Canada', 'Documents for UK', 'Documents for Schengen'],
  },
  {
    id: 'processing',
    keywords: ['processing', 'time', 'how long', 'duration', 'timeline', 'days', 'weeks', 'months', 'fast', 'quick', 'urgent', 'wait', 'waiting'],
    answer: () => `Indicative processing times:${list(destinations.map((d) => `${d.flag} ${d.name}: <b>${d.processing}</b>`))}Times vary by season and embassy load — apply early, ideally 3–6 months ahead for study visas.`,
    chips: ['Book consultation', 'Fees'],
  },
  {
    id: 'refusal',
    keywords: ['refused', 'refusal', 'rejected', 'rejection', 'denied', 'decline', 'declined', 'deny', 'reject'],
    answer: () => `A previous refusal is <b>not the end</b>. We analyse your refusal letter, fix the weak points (funds, ties, purpose, documents) and re-apply with a stronger file — or recommend a better-suited country. Share your refusal letter during a ${link('/contact.html', 'free consultation')}.`,
    chips: ['Book consultation'],
  },
  {
    id: 'ielts',
    keywords: ['ielts', 'pte', 'toefl', 'duolingo', 'english test', 'english', 'band', 'bands', 'score', 'language test', 'celpip', 'without ielts'],
    answer: () => `We offer <b>IELTS & PTE coaching</b> with mock tests and booking support. Typical requirements:${list(['UK / Australia / Canada study: IELTS 6.0–6.5 overall (varies by course)', 'Some universities accept PTE, Duolingo or an English-medium instruction (MOI) letter', 'Canada Express Entry: higher CLB scores = more CRS points'])}Want us to check universities that match your score?`,
    chips: ['Study visa', 'Book consultation'],
  },
  {
    id: 'scholarship',
    keywords: ['scholarship', 'scholarships', 'funding', 'funded', 'discount', 'financial aid', 'assistantship', 'bursary', 'free education', 'free tuition'],
    answer: () => `Yes — we hunt <b>merit scholarships, tuition discounts and assistantships</b> for every application, and help with the essays. Germany also offers low or no tuition at public universities. ${link('/study-abroad.html', 'Explore study abroad')}.`,
    chips: ['Study in Germany', 'Study in UK', 'Book consultation'],
  },
  {
    id: 'work-study',
    keywords: ['part time', 'part-time', 'work while studying', 'work during study', 'job while studying', 'hours per week'],
    answer: () => `Most study destinations allow <b>part-time work during term</b> (often around 20 hours per week) and full-time work during official breaks. Exact limits differ by country and change over time — we brief you on the current rules before you fly.`,
    chips: ['Study in Canada', 'Study in Australia', 'Study in UK'],
  },
  {
    id: 'family',
    keywords: ['spouse', 'wife', 'husband', 'family', 'dependent', 'dependant', 'children', 'kids', 'partner', 'marriage', 'parents', 'reunion'],
    answer: () => `We prepare <b>spouse, dependant and family reunion</b> visas with careful relationship and financial evidence. Some study routes also allow dependants (rules differ by country and level of study). Tell me the country and we'll check the options.`,
    chips: ['Canada', 'UK', 'Australia', 'Book consultation'],
  },
  {
    id: 'eligibility',
    keywords: ['eligible', 'eligibility', 'qualify', 'chance', 'chances', 'can i go', 'can i apply', 'assessment', 'profile', 'possible', 'evaluate', 'gap', 'low cgpa', 'age limit', 'age'],
    answer: () => `Every profile is different — education, gaps, funds, age and work history all matter. Our counsellors do a <b>free profile assessment</b> and map every route you qualify for. ${link('/contact.html', 'Book yours here')} or use the search form on the homepage.`,
    chips: ['Book consultation', 'Contact details'],
  },
  {
    id: 'consultation',
    keywords: ['book', 'booking', 'appointment', 'consultation', 'consult', 'meeting', 'counsellor', 'counselor', 'advisor', 'talk to', 'speak', 'call me', 'human', 'agent', 'person', 'callback'],
    answer: () => `Let's get you booked! 📅 Your first consultation is <b>free</b> — in our office, by phone or online.${list([`${link('/contact.html', 'Book online')} (takes 1 minute)`, `WhatsApp: ${link(CONTACT.whatsapp, CONTACT.phone)}`, `Call: ${link(CONTACT.phoneHref, CONTACT.phone)}`])}`,
    chips: ['Contact details', 'Office hours'],
  },
  {
    id: 'contact',
    keywords: ['contact', 'phone', 'number', 'call', 'whatsapp', 'email', 'mail', 'address', 'location', 'office', 'where are you', 'located', 'visit office', 'map', 'directions', 'reach'],
    answer: () => `📍 ${CONTACT.address}<br>📞 ${link(CONTACT.phoneHref, CONTACT.phone)}<br>💬 ${link(CONTACT.whatsapp, 'WhatsApp us')}<br>✉️ ${link(`mailto:${CONTACT.email}`, CONTACT.email)}<br>🕘 ${CONTACT.hours}`,
    chips: ['Book consultation'],
  },
  {
    id: 'hours',
    keywords: ['hours', 'timing', 'timings', 'open', 'opening', 'closed', 'sunday', 'saturday', 'when open'],
    answer: () => `We're open <b>${CONTACT.hours}</b> (PKT). Our WhatsApp line is answered 7 days a week.`,
    chips: ['Contact details', 'Book consultation'],
  },
  {
    id: 'about',
    keywords: ['about', 'who are you', 'company', 'experience', 'licensed', 'license', 'trust', 'trusted', 'genuine', 'legit', 'reliable', 'success rate', 'reviews', 'fraud', 'scam'],
    answer: () => `Go Abroad has helped people move abroad since <b>2012</b>: 12,500+ visas approved, a 98% success rate and 350+ partner universities. We're transparent — written quotes, no hidden fees and no false guarantees. ${link('/about.html', 'Meet the team')}.`,
    chips: ['Book consultation', 'Services'],
  },
  {
    id: 'guarantee',
    keywords: ['guarantee', 'guaranteed', '100%', 'sure shot', 'confirm visa', 'definitely'],
    answer: () => `Honestly, no consultant can guarantee a visa — the decision belongs to the embassy. What we guarantee is a <b>complete, accurate and well-presented file</b>, which is why our approval rate is consistently high.`,
    chips: ['Book consultation'],
  },
  {
    id: 'choose',
    keywords: ['which country', 'best country', 'best for me', 'recommend', 'suggest', 'choose', 'confused', 'not sure', 'help me choose', 'compare', 'cheapest', 'easiest', 'easy'],
    answer: () => `Great question! It depends on your goal:${list(['🎓 <b>Low tuition</b> → Germany', '⚡ <b>One-year master\'s</b> → UK, Ireland', '🏡 <b>Study → work → PR pathway</b> → Canada, Australia, New Zealand', '🔬 <b>Top research & STEM</b> → USA', '🏝️ <b>Holiday in many countries</b> → Schengen'])}Tell me your goal or budget, or ${link('/contact.html', 'get a free side-by-side comparison')}.`,
    chips: ['Study visa', 'Immigration / PR', 'Visit visa', 'Book consultation'],
  },
  {
    id: 'express-entry',
    keywords: ['express entry', 'crs', 'crs score', 'points', 'point', 'pnp', 'provincial', 'skillselect', 'eoi', 'points test'],
    answer: () => `Points-based PR systems we handle:${list(['<img class="flag" src="/flags/ca.svg" alt="" width="24" height="18" loading="lazy"> <b>Canada Express Entry</b> — CRS points for age, education, language and work experience; Provincial Nominee Programs add a big boost', '<img class="flag" src="/flags/au.svg" alt="" width="24" height="18" loading="lazy"> <b>Australia SkillSelect</b> — subclass 189 / 190 / 491 with a points test and skills assessment', '<img class="flag" src="/flags/nz.svg" alt="" width="24" height="18" loading="lazy"> <b>New Zealand</b> Skilled Migrant Category'])}We'll calculate your score and show you how to raise it.`,
    chips: ['PR in Canada', 'PR in Australia', 'Book consultation'],
  },
];

export const FAQ_ITEMS = faqs.flatMap((g) => g.items);

export const COUNTRY_CHIPS = (id) => {
  const d = byId[id];
  const name = d.short || d.name;
  return [
    ...d.types.map((t) => `${t === 'pr' ? 'PR' : TYPE_NAMES[t]} in ${name}`),
    `Documents for ${name}`,
    `Fees for ${name}`,
  ];
};
