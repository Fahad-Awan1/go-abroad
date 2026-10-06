// Top-view airliner (nose pointing right), shared by the scroll route and the
// page fly-through transition. Plain SVG string so it works at build time too.
export const PLANE_SVG = `<svg class="plane-top" viewBox="0 0 120 120" aria-hidden="true">
  <path d="M65 54 41 9h-8l11 45zM65 66 41 111h-8l11-45z" fill="#e3eaee" stroke="#7d929c" stroke-width="1.4" stroke-linejoin="round"/>
  <rect x="56" y="38" width="13" height="6" rx="3" fill="#c9d3da" stroke="#7d929c"/><rect x="48" y="24" width="13" height="6" rx="3" fill="#c9d3da" stroke="#7d929c"/>
  <rect x="56" y="76" width="13" height="6" rx="3" fill="#c9d3da" stroke="#7d929c"/><rect x="48" y="90" width="13" height="6" rx="3" fill="#c9d3da" stroke="#7d929c"/>
  <path d="M22 57 11 39H6l6 18zM22 63 11 81H6l6-18z" fill="#0e8fa8" stroke="#0b6f84" stroke-linejoin="round"/>
  <path d="M10 60c0-4 4-7 10-7h72c12 0 22 3 26 7-4 4-14 7-26 7H20c-6 0-10-3-10-7z" fill="#fff" stroke="#7d929c" stroke-width="1.4"/>
  <path d="M26 60h70" stroke="#2bb8c9" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>
  <path d="M105 56.6c3.6.8 7 2 9.4 3.4-2.4 1.4-5.8 2.6-9.4 3.4z" fill="#1b2330"/>
  <rect x="8" y="58.4" width="16" height="3.2" rx="1.6" fill="#0e8fa8"/>
</svg>`;
