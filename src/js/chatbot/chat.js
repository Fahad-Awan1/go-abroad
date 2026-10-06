import { createEngine } from './engine.js';
import { DEFAULT_CHIPS } from './knowledge.js';

const STORE_KEY = 'ga-chat-v1';
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const time = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export function mountChat(root, { lenis } = {}) {
  const panel = root.querySelector('[data-chat-panel]');
  const toggle = root.querySelector('[data-chat-toggle]');
  const closeBtn = root.querySelector('[data-chat-close]');
  const log = root.querySelector('[data-chat-log]');
  const chipsEl = root.querySelector('[data-chat-chips]');
  const form = root.querySelector('[data-chat-form]');
  const input = form.querySelector('input');
  const teaser = root.querySelector('[data-chat-teaser]');
  const reply = createEngine();
  const avatar = root.querySelector('.chat__avatar svg')?.outerHTML || '';

  let history = [];
  try { history = JSON.parse(sessionStorage.getItem(STORE_KEY) || '[]'); } catch { history = []; }
  const save = () => { try { sessionStorage.setItem(STORE_KEY, JSON.stringify(history.slice(-40))); } catch {} };

  const scrollDown = () => log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });

  const addMsg = (from, html, { store = true, at = time() } = {}) => {
    const row = document.createElement('div');
    row.className = `chat__msg chat__msg--${from}`;
    row.innerHTML = `${from === 'bot' ? `<span class="chat__msg-avatar" aria-hidden="true">${avatar}</span>` : ''}<div class="chat__bubble">${html}<time>${at}</time></div>`;
    log.appendChild(row);
    if (store) { history.push({ from, html, at }); save(); }
    scrollDown();
  };

  const setChips = (chips = DEFAULT_CHIPS) => {
    chipsEl.innerHTML = '';
    chips.forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chat__chip';
      b.textContent = c;
      b.addEventListener('click', () => ask(c));
      chipsEl.appendChild(b);
    });
  };

  let busy = false;
  const ask = (text) => {
    text = text.trim();
    if (!text || busy) return;
    busy = true;
    addMsg('user', esc(text));
    chipsEl.innerHTML = '';
    const typing = document.createElement('div');
    typing.className = 'chat__msg chat__msg--bot chat__typing';
    typing.innerHTML = `<span class="chat__msg-avatar" aria-hidden="true">${avatar}</span><div class="chat__bubble"><i></i><i></i><i></i><span class="sr-only">Ava is typing</span></div>`;
    log.appendChild(typing);
    scrollDown();
    const res = reply(text);
    const delay = Math.min(1300, 450 + res.html.length * 1.5);
    setTimeout(() => {
      typing.remove();
      addMsg('bot', res.html);
      setChips(res.chips || DEFAULT_CHIPS);
      busy = false;
    }, delay);
  };

  const greet = () => {
    addMsg('bot', "Hi there! 👋 I'm <b>Ava</b>, your Go Abroad assistant. Ask me about study, work, visit or PR visas — fees, documents, timelines, anything.");
    setChips();
  };

  // restore previous conversation
  if (history.length) {
    history.forEach((m) => addMsg(m.from, m.html, { store: false, at: m.at }));
    setChips();
  }

  const open = (focus = true) => {
    if (!panel.hidden) return;
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('is-open'));
    root.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    teaser.hidden = true;
    try { localStorage.setItem('ga-chat-seen', '1'); } catch {}
    if (!history.length) greet();
    if (focus && window.matchMedia('(min-width: 601px)').matches) setTimeout(() => input.focus(), 300);
    if (window.matchMedia('(max-width: 600px)').matches) lenis?.stop();
  };
  const close = () => {
    panel.classList.remove('is-open');
    root.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    lenis?.start();
    setTimeout(() => { if (!panel.classList.contains('is-open')) panel.hidden = true; }, 350);
  };

  toggle.addEventListener('click', () => (panel.hidden ? open() : close()));
  closeBtn.addEventListener('click', () => { close(); toggle.focus(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { close(); toggle.focus(); } });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = '';
    ask(v);
  });
  // keep wheel scrolling inside the chat log (Lenis would otherwise capture it)
  log.setAttribute('data-lenis-prevent', '');

  // friendly teaser once per visitor
  let seen = false;
  try { seen = localStorage.getItem('ga-chat-seen') === '1'; } catch {}
  if (!seen) {
    setTimeout(() => { if (panel.hidden) { teaser.hidden = false; requestAnimationFrame(() => teaser.classList.add('is-visible')); } }, 7000);
    teaser.addEventListener('click', () => open());
  }

  return {
    open,
    close,
    ask: (text) => { open(false); setTimeout(() => ask(text), history.length ? 150 : 600); },
  };
}
