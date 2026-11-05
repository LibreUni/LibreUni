const KEY = 'lu:dev-theme';
const CATS = [
  { label: 'Brand', vars: [{ k: '--primary-rgb', l: 'Primary' }, { k: '--secondary-rgb', l: 'Secondary' }, { k: '--accent-rgb', l: 'Accent' }] },
  { label: 'Light', vars: [{ k: '--light-bg-rgb', l: 'BG' }, { k: '--light-surface-rgb', l: 'Surface' }, { k: '--light-border-rgb', l: 'Border' }, { k: '--light-text-rgb', l: 'Text' }, { k: '--light-muted-rgb', l: 'Muted' }, { k: '--light-accent-rgb', l: 'Accent' }] },
  { label: 'Dark', vars: [{ k: '--dark-bg-rgb', l: 'BG' }, { k: '--dark-surface-rgb', l: 'Surface' }, { k: '--dark-border-rgb', l: 'Border' }, { k: '--dark-text-rgb', l: 'Text' }, { k: '--dark-muted-rgb', l: 'Muted' }, { k: '--dark-accent-rgb', l: 'Accent' }] },
];
const FONTS = ['Plus Jakarta Sans', 'Literata', 'Space Grotesk'];

function load(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function read(k: string): string {
  const o = load();
  if (o[k]) return o[k];
  return getComputedStyle(document.documentElement).getPropertyValue(k).trim();
}

function write(k: string, v: string) {
  const o = load();
  o[k] = v;
  localStorage.setItem(KEY, JSON.stringify(o));
  applyStyles();
}

function rgb2h(s: string): string {
  const p = s.split(' ').map(Number);
  return '#' + p.map((v) => v.toString(16).padStart(2, '0')).join('');
}

function h2r(h: string): string | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
  return m ? `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}` : null;
}

export function applyStyles() {
  let styleEl = document.getElementById('lu-dev-themer-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'lu-dev-themer-styles';
    document.head.appendChild(styleEl);
  }
  const o = load();
  const curT = document.documentElement.dataset.theme || 'modern';
  const lightVars: string[] = [];
  const darkVars: string[] = [];
  const globalVars: string[] = [];

  Object.keys(o).forEach((k) => {
    const val = o[k];
    if (k === '--font-sans') {
      globalVars.push(`${k}: ${val};`);
    } else if (k.startsWith('--light-')) {
      lightVars.push(`${k}: ${val};`);
      if (k.endsWith('-rgb')) {
        try {
          lightVars.push(`${k.slice(0, -4)}: ${rgb2h(val)};`);
        } catch {}
      }
    } else if (k.startsWith('--dark-')) {
      darkVars.push(`${k}: ${val};`);
      if (k.endsWith('-rgb')) {
        try {
          darkVars.push(`${k.slice(0, -4)}: ${rgb2h(val)};`);
        } catch {}
      }
    } else {
      globalVars.push(`${k}: ${val};`);
      if (k.endsWith('-rgb')) {
        try {
          globalVars.push(`${k.slice(0, -4)}: ${rgb2h(val)};`);
        } catch {}
      }
    }
  });

  let css = '';
  const lightSelector = curT === 'modern' ? 'html[data-theme="modern"], :root' : `html[data-theme="${curT}"]`;
  const darkSelector = curT === 'modern' ? 'html.dark' : `html.dark[data-theme="${curT}"]`;
  const globalSelector = curT === 'modern' ? ':root' : `html[data-theme="${curT}"]`;

  if (globalVars.length) css += `${globalSelector} {\n  ${globalVars.join('\n  ')}\n}\n`;
  if (lightVars.length) css += `${lightSelector} {\n  ${lightVars.join('\n  ')}\n}\n`;
  if (darkVars.length) css += `${darkSelector} {\n  ${darkVars.join('\n  ')}\n}\n`;
  styleEl.textContent = css;
}

export function initDevThemer() {
  const isEnabled = localStorage.getItem('lu:enable-dev-themer') === 'true';
  if (!isEnabled) {
    const existing = document.getElementById('lu-dev-themer');
    if (existing) existing.remove();
    return;
  }

  let existing = document.getElementById('lu-dev-themer');
  if (existing) existing.remove();

  const c = document.createElement('div');
  c.id = 'lu-dev-themer';
  c.innerHTML = `
<style>
#lu-dev-themer{all:initial;font-family:system-ui,sans-serif;position:fixed;bottom:16px;right:16px;z-index:2147483647;font-size:13px;line-height:1.4;color:#111;--l-bg:#fff;--l-b2:#f5f5f5;--l-b3:#e5e5e5;--l-t:#111;--l-m:#666;--l-ac:#3b82f6;--br:8px}
#lut-btn{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:999px;border:1px solid #e5e5e5;background:var(--l-bg);cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,.12);font-size:18px;transition:transform .15s;margin-left:auto}
#lut-btn:hover{transform:scale(1.08)}
#lut-btn.open{transform:rotate(45deg)}
#lut-panel{display:none;position:absolute;bottom:52px;right:0;width:340px;max-height:min(600px,80vh);overflow-y:auto;border:1px solid var(--l-b3);border-radius:var(--br);background:var(--l-bg);box-shadow:0 8px 32px rgba(0,0,0,.15);padding:0}
#lu-dev-themer.open #lut-panel{display:block}
#lu-dev-themer.open #lut-btn{transform:rotate(45deg)}
.lut-h{padding:12px 14px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--l-m)}
.lut-row{display:flex;align-items:center;gap:8px;padding:4px 14px}
.lut-row label{width:64px;font-size:11px;font-weight:600;color:var(--l-m);flex-shrink:0}
.lut-row input[type=color]{width:28px;height:28px;padding:0;border:1px solid var(--l-b3);border-radius:4px;cursor:pointer;background:none}
.lut-val{font-size:10px;font-family:monospace;color:var(--l-m)}
.lut-input-select{flex:1;padding:4px 6px;font-size:11px;border:1px solid var(--l-b3);border-radius:4px;background:var(--l-bg);color:var(--l-t);outline:none}
.lut-topbar{display:flex;align-items:center;gap:6px;padding:12px 14px 8px;border-bottom:1px solid var(--l-b3)}
.lut-topbar-title{flex:1;font-size:12px;font-weight:850;color:var(--l-t)}
.lut-topbar button{padding:6px 8px;font-size:10px;font-weight:800;border:1px solid var(--l-b3);border-radius:6px;background:var(--l-b2);color:var(--l-t);cursor:pointer}
.lut-disclosure{border-bottom:1px solid var(--l-b3)}
.lut-disclosure summary{cursor:pointer;list-style:none;padding:10px 14px;font-size:11px;font-weight:800;color:var(--l-t)}
</style>
<div id="lut-btn" aria-label="Open developer tools">+</div>
<div id="lut-panel">
  <div class="lut-topbar"><span class="lut-topbar-title">Developer tools</span><button id="lut-reset">Reset</button></div>
  <details class="lut-disclosure" open><summary>Theme colors</summary><div id="lut-colors"></div></details>
  <details class="lut-disclosure"><summary>Typography</summary><div class="lut-row"><label>Font</label><select class="lut-input-select" id="lut-font"></select></div></details>
</div>`;
  document.body.appendChild(c);
  document.getElementById('lut-btn')?.addEventListener('click', () => c.classList.toggle('open'));

  const colorsEl = document.getElementById('lut-colors');
  CATS.forEach((cat) => {
    const h = document.createElement('div');
    h.className = 'lut-h';
    h.textContent = cat.label;
    colorsEl?.appendChild(h);
    cat.vars.forEach((v) => {
      const val = read(v.k);
      const hex = val ? rgb2h(val) : '#888888';
      const row = document.createElement('div');
      row.className = 'lut-row';
      const inp = document.createElement('input');
      inp.type = 'color';
      inp.value = hex;
      inp.oninput = () => {
        const rgb = h2r(inp.value);
        if (rgb) {
          write(v.k, rgb);
          const vEl = row.querySelector('.lut-val');
          if (vEl) vEl.textContent = rgb;
        }
      };
      const lbl = document.createElement('label');
      lbl.textContent = v.l;
      const valEl = document.createElement('span');
      valEl.className = 'lut-val';
      valEl.textContent = val;
      row.append(inp, lbl, valEl);
      colorsEl?.appendChild(row);
    });
  });

  const fontEl = document.getElementById('lut-font') as HTMLSelectElement | null;
  const curFont = read('--font-sans');
  FONTS.forEach((f) => {
    const o = document.createElement('option');
    o.value = f;
    o.textContent = f;
    if (f === curFont) o.selected = true;
    fontEl?.appendChild(o);
  });
  if (fontEl) {
    fontEl.onchange = () => write('--font-sans', fontEl.value);
  }

  document.getElementById('lut-reset')?.addEventListener('click', () => {
    localStorage.removeItem(KEY);
    document.getElementById('lu-dev-themer-styles')?.remove();
    location.reload();
  });

  applyStyles();
}
