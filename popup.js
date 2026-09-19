/* ============================================================
   WebClone AI — popup.js
   Auto-generate clone prompt + auto-copy to clipboard
   Developed by Abrar
   ============================================================ */

const $ = id => document.getElementById(id);
const out = $('out');
const banner = $('banner');
const meta = $('meta');

/* ---------- Banner helpers ---------- */
function setBanner(state, text, spin = false) {
  banner.className = 'banner ' + state;
  banner.innerHTML = (spin ? '<div class="spinner"></div>' : '') +
                     `<span>${text}</span>`;
}

/* ---------- Extractor (runs inside the page) ---------- */
function extractSiteData() {
  const cs = el => el ? getComputedStyle(el) : null;
  const txt = el => el ? (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 400) : '';
  const uniq = arr => [...new Set(arr.filter(x => x && x.length > 0))];

  const body = document.body;
  const bodyCS = cs(body);
  const h1 = document.querySelector('h1');
  const h1CS = cs(h1);
  const btn = document.querySelector('button, a[class*="btn"], a[class*="button"], [role="button"]');
  const btnCS = cs(btn);
  const main = document.querySelector('main, .container, #container, .wrapper');

  // Section flow
  const sections = [];
  const sels = document.querySelectorAll('header, nav, section, main > div, article, footer');
  let idx = 0;
  for (const s of sels) {
    if (idx >= 25) break;
    const h = s.querySelector('h1,h2,h3');
    const tag = s.tagName.toLowerCase();
    if (h) {
      sections.push(`${++idx}. <${tag}> → "${txt(h)}"`);
    } else if (s.children.length > 2) {
      sections.push(`${++idx}. <${tag}> → (content block)`);
    }
  }

  // Button colors
  const allBtns = [...document.querySelectorAll('button, a[class*="btn"]')].slice(0, 10);
  const btnColors = uniq(
    allBtns.map(b => cs(b)?.backgroundColor).filter(c => c && c !== 'rgba(0, 0, 0, 0)')
  );

  return {
    url: location.href,
    title: document.title,
    desc: document.querySelector('meta[name="description"]')?.content || '',
    colors: {
      bg: bodyCS?.backgroundColor || '',
      text: bodyCS?.color || '',
      headingColor: h1CS?.color || '',
      headingFont: (h1CS?.fontFamily || '').split(',')[0].replace(/['"]/g, ''),
      headingWeight: h1CS?.fontWeight || '',
      bodyFont: (bodyCS?.fontFamily || '').split(',')[0].replace(/['"]/g, ''),
      btnBg: btnCS?.backgroundColor || '',
      btnText: btnCS?.color || '',
      btnRadius: btnCS?.borderRadius || '',
      btnColors: btnColors.slice(0, 5)
    },
    container: main ? cs(main)?.maxWidth : '1200px',
    headings: uniq([...document.querySelectorAll('h1,h2,h3')]
      .slice(0, 40).map(h => `${h.tagName}: ${txt(h)}`)).slice(0, 25),
    navLinks: uniq([...document.querySelectorAll('header a, nav a')]
      .slice(0, 20).map(txt)),
    buttons: uniq([...document.querySelectorAll('button, a[role="button"], a[class*="btn"]')]
      .slice(0, 25).map(b => txt(b) || b.value || '').filter(Boolean)),
    images: uniq([...document.querySelectorAll('img')]
      .slice(0, 20).map(i => (i.alt || '').trim() || i.src.split('/').pop())),
    paras: uniq([...document.querySelectorAll('p')]
      .slice(0, 15).map(txt).filter(t => t.length > 60)),
    inputs: uniq([...document.querySelectorAll('input,textarea')]
      .slice(0, 10).map(i => i.placeholder || i.name || i.type)),
    links: uniq([...document.querySelectorAll('footer a')]
      .slice(0, 20).map(txt))
  };
}

/* ---------- Prompt builder ---------- */
function buildPrompt(d) {
  const list = (label, arr) =>
    arr && arr.length
      ? `\n${label}:\n${arr.map(x => `- ${x}`).join('\n')}\n`
      : '';

  return `You are a senior frontend engineer. Recreate the website below as a
pixel-perfect, fully responsive clone.

=== SITE INFO ===
Title: ${d.title}
Description: ${d.desc || 'N/A'}
Reference URL: ${d.url}

=== DESIGN SYSTEM ===
Background: ${d.colors.bg}
Body text: ${d.colors.text}
Heading color: ${d.colors.headingColor}
Button background: ${d.colors.btnBg}
Button text: ${d.colors.btnText}
Button radius: ${d.colors.btnRadius}
Heading font: ${d.colors.headingFont} (weight ${d.colors.headingWeight})
Body font: ${d.colors.bodyFont}
Container max-width: ${d.container}
${d.colors.btnColors.length > 1 ? `Other button colors: ${d.colors.btnColors.join(', ')}` : ''}

=== PAGE STRUCTURE ===
${list('SECTIONS (top to bottom)', d.sections)}
${list('HEADINGS', d.headings)}
${list('NAV LINKS', d.navLinks)}
${list('BUTTONS / CTA', d.buttons)}
${list('FORM FIELDS', d.inputs)}
${list('IMAGE IDEAS', d.images)}
${list('FOOTER LINKS', d.links)}
${list('BODY COPY', d.paras)}

=== INTERACTIONS ===
- Sticky navbar with blur on scroll
- Mobile hamburger menu toggle
- Hover lift effect on cards & buttons
- Fade-in animation on scroll (IntersectionObserver)
- Smooth scrolling for anchor links

=== OUTPUT REQUIREMENTS ===
- Single index.html with Tailwind CDN (no build step)
- Mobile-first, fully responsive (test at 375px, 768px, 1440px)
- Semantic HTML5 tags (header, nav, main, section, footer)
- Accessible: aria labels, alt text, focus states
- Placeholder images: https://picsum.photos/seed/{word}/800/600
- Icons: inline SVG or Lucide CDN
- No backend, no external APIs, no tracking
- Clean, well-commented code
- Match spacing, typography scale, and color tones closely

---
Prompt generated by WebClone AI — Developed by Abrar
`;
}

/* ---------- Main: generate + auto-copy ---------- */
async function generateAndCopy() {
  setBanner('loading', 'Page read kar raha hoon...', true);
  out.value = '';
  meta.textContent = '';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.url || /^(chrome|edge|about|chrome-extension|moz-extension):/.test(tab.url)) {
      throw new Error('Yeh page support nahi karta. Normal website kholo.');
    }

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractSiteData
    });

    const prompt = buildPrompt(result);
    out.value = prompt;

    // Auto-copy
    let copied = false;
    try {
      await navigator.clipboard.writeText(prompt);
      copied = true;
    } catch {
      out.select();
      document.execCommand('copy');
      copied = out.value.length > 0;
    }

    if (copied) {
      setBanner('ok', '✅ Prompt copied! Paste it in Claude, Lovable, v0.');
      try {
        chrome.notifications?.create({
          type: 'basic',
          iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          title: 'WebClone AI',
          message: 'Prompt clipboard mein copy ho gaya ✅'
        });
      } catch {}
    } else {
      setBanner('err', '⚠️ Auto-copy fail. "Copy Again" dabao.');
    }

    const words = prompt.split(/\s+/).length;
    const chars = prompt.length;
    meta.textContent = `${result.title.slice(0, 50)} • ~${words} words • ${chars} chars`;

  } catch (e) {
    setBanner('err', '❌ ' + e.message);
  }
}

/* ---------- Manual buttons ---------- */
$('copy').onclick = async () => {
  if (!out.value.trim()) return setBanner('err', 'Pehle generate karo.');
  try {
    await navigator.clipboard.writeText(out.value);
    setBanner('ok', '📋 Copied again!');
  } catch {
    out.select();
    document.execCommand('copy');
    setBanner('ok', '📋 Copied (fallback).');
  }
};

$('dl').onclick = () => {
  if (!out.value.trim()) return setBanner('err', 'Pehle generate karo.');
  const blob = new Blob([out.value], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  const name = (out.value.match(/Title: (.+)/)?.[1] || 'webclone-prompt')
    .replace(/[^a-z0-9]/gi, '-').slice(0, 40);
  a.href = URL.createObjectURL(blob);
  a.download = `${name}-prompt.txt`;
  a.click();
  setBanner('ok', '💾 File save ho gayi!');
};

$('regen').onclick = () => generateAndCopy();

/* ---------- Auto-run on open ---------- */
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(generateAndCopy, 150);
});
