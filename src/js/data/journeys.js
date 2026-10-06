// "Your visa journey": per-page flight details for the departure board and the
// scroll route. Every page is a short flight; each stop is a section that gets a
// passport stamp when the plane passes it.
//
// stop: { sel, stage, code, side? }  sel = CSS selector of the section,
//   stage/code = stamp text, side = 'L' | 'R' to force the route's side (else alternates).

export const journeys = {
  home: {
    name: 'HOME', flight: 'GA 101', gate: '01', from: 'ISB', to: 'YYZ',
    stops: [
      { sel: '#intro', stage: 'CHECK-IN', code: 'ISB' },
      { sel: 'main > .services', stage: 'BOARDING', code: 'GATE 02' },
      { sel: '[data-process]', stage: 'IN FLIGHT', code: '36,000 FT' },
      { sel: '.globe-section', stage: 'ROUTE SET', code: '8 COUNTRIES' },
      { sel: 'main > .feature', stage: 'CAMPUS', code: 'UNI' },
      { sel: 'main > .testimonials', stage: 'ARRIVED', code: 'YYZ' },
    ],
  },
  services: {
    name: 'SERVICES', flight: 'GA 102', gate: '02', from: 'ISB', to: 'LHR',
    stops: [
      { sel: 'main > section:nth-of-type(2)', stage: 'TERMINAL', code: '6 SERVICES', side: 'L' },
      { sel: '#study', stage: 'STUDY', code: 'CAS', side: 'R' },
      { sel: '#work', stage: 'WORK', code: 'PERMIT', side: 'R' },
      { sel: '#visit', stage: 'VISIT', code: 'SCHENGEN', side: 'R' },
      { sel: '#pr', stage: 'PR', code: 'EXPRESS ENTRY', side: 'R' },
      { sel: '#family', stage: 'FAMILY', code: 'REUNION', side: 'R' },
      { sel: '#test', stage: 'IELTS', code: 'BAND 7', side: 'R' },
      { sel: 'main > section:nth-of-type(4)', stage: 'GATE OPEN', code: 'LHR', side: 'L' },
    ],
  },
  destinations: {
    name: 'DESTINATIONS', flight: 'GA 103', gate: '03', from: 'ISB', to: 'SYD',
    stops: [
      { sel: '#all', stage: 'SELECT ROUTE', code: '8 COUNTRIES' },
      { sel: 'main > section:nth-of-type(3)', stage: 'ADVICE DESK', code: 'SYD' },
    ],
  },
  'study-abroad': {
    name: 'STUDY ABROAD', flight: 'GA 104', gate: '04', from: 'ISB', to: 'MUC',
    stops: [
      { sel: '#timeline', stage: 'ITINERARY', code: '12 MONTHS' },
      { sel: 'main > section:nth-of-type(3)', stage: 'CHOOSE CAMPUS', code: '7 COUNTRIES' },
      { sel: 'main > section:nth-of-type(4)', stage: 'LANGUAGE CHECK', code: 'IELTS' },
      { sel: 'main > section:nth-of-type(5)', stage: 'FUNDING', code: 'MUC' },
    ],
  },
  about: {
    name: 'ABOUT', flight: 'GA 105', gate: '05', from: 'ISB', to: 'DXB',
    stops: [
      { sel: 'main > section:nth-of-type(2)', stage: 'SINCE', code: '2012' },
      { sel: 'main > section:nth-of-type(3)', stage: 'FLIGHT LOG', code: 'MILESTONES' },
      { sel: 'main > section:nth-of-type(4)', stage: 'CREW CODE', code: 'VALUES' },
      { sel: 'main > section:nth-of-type(5)', stage: 'YOUR CREW', code: 'TEAM' },
      { sel: 'main > section:nth-of-type(7)', stage: 'GATE OPEN', code: 'DXB' },
    ],
  },
  faq: {
    name: 'FAQ', flight: 'GA 106', gate: '06', from: 'ISB', to: 'DUB',
    stops: [{ sel: 'main > section:nth-of-type(2)', stage: 'INFO DESK', code: '12 ANSWERS', side: 'R' }],
  },
  contact: {
    name: 'CONTACT', flight: 'GA 107', gate: '07', from: 'ISB', to: 'ISB',
    stops: [{ sel: 'main > section:nth-of-type(2)', stage: 'BOOKING', code: 'OPEN' }],
  },
  404: { name: 'LOST', flight: 'GA 404', gate: '--', from: 'ISB', to: '???', stops: [] },
};

/** Journey for a URL path ('/', '/services.html', …). */
export function journeyForPath(pathname) {
  const slug = pathname.replace(/^\/+|\.html$/g, '') || 'index';
  return journeys[slug === 'index' ? 'home' : slug] || journeys[404];
}
