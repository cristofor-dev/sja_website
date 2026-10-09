/* TipTap/ProseMirror JSON → HTML. Only the node and mark types listed here
   are ever emitted, and every attribute is escaped or validated, so a stored
   document can never inject script. */

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function safeHref(href) {
  href = String(href || '').trim();
  return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(href) && !href.startsWith('//') ? href : null;
}

function safeSrc(src) {
  src = String(src || '').trim();
  return /^(https:\/\/|\/media\/|\/assets\/)/i.test(src) ? src : null;
}

function marks(text, list = []) {
  let out = esc(text);
  for (const m of list) {
    if (m.type === 'bold') out = `<strong>${out}</strong>`;
    else if (m.type === 'italic') out = `<em>${out}</em>`;
    else if (m.type === 'underline') out = `<u>${out}</u>`;
    else if (m.type === 'strike') out = `<s>${out}</s>`;
    else if (m.type === 'code') out = `<code>${out}</code>`;
    else if (m.type === 'link') {
      const href = safeHref(m.attrs?.href);
      if (href) out = `<a href="${esc(href)}"${/^https?:/i.test(href) ? ' rel="noopener"' : ''}>${out}</a>`;
    }
  }
  return out;
}

function children(node) {
  return (node.content || []).map(render).join('');
}

function render(node) {
  switch (node.type) {
    case 'text': return marks(node.text, node.marks);
    case 'paragraph': return `<p>${children(node)}</p>\n`;
    case 'heading': {
      const level = Math.min(4, Math.max(2, Number(node.attrs?.level) || 2));
      return `<h${level}>${children(node)}</h${level}>\n`;
    }
    case 'bulletList': return `<ul>\n${children(node)}</ul>\n`;
    case 'orderedList': return `<ol>\n${children(node)}</ol>\n`;
    case 'listItem': return `<li>${children(node)}</li>\n`;
    case 'blockquote': return `<blockquote class="quote">${children(node)}</blockquote>\n`;
    case 'codeBlock': return `<pre><code>${children(node)}</code></pre>\n`;
    case 'horizontalRule': return '<hr>\n';
    case 'hardBreak': return '<br>';
    case 'image': {
      const src = safeSrc(node.attrs?.src);
      if (!src) return '';
      const img = `<img src="${esc(src)}" alt="${esc(node.attrs?.alt || '')}" loading="lazy">`;
      const caption = node.attrs?.title;
      return caption ? `<figure>${img}<figcaption>${esc(caption)}</figcaption></figure>\n` : `<figure>${img}</figure>\n`;
    }
    case 'youtube': {
      const id = String(node.attrs?.videoId || '');
      if (!/^[\w-]{11}$/.test(id)) return '';
      return `<div class="cms-video"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="Video" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>\n`;
    }
    default: return children(node);
  }
}

export function renderDoc(body) {
  let doc = body;
  if (typeof body === 'string') {
    try { doc = JSON.parse(body); } catch { return ''; }
  }
  return doc && doc.type === 'doc' ? children(doc) : '';
}

/* plain text of a document, for excerpts when the author wrote none */
export function plainText(body, max = 200) {
  let doc = body;
  if (typeof body === 'string') {
    try { doc = JSON.parse(body); } catch { return ''; }
  }
  const parts = [];
  (function walk(n) {
    if (n.type === 'text') parts.push(n.text);
    (n.content || []).forEach(walk);
    if (['paragraph', 'heading', 'listItem'].includes(n.type)) parts.push(' ');
  })(doc || {});
  const text = parts.join('').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, '')}…` : text;
}

/* Wrap content in the site's own header, drawer and footer: the shell is the
   Contact page, fetched from the static assets, with its body swapped out. */
export async function renderShell({ request, env }, { title, label, crumbs, html, description = '', image = '', status = 200, headers = {} }) {
  const origin = new URL(request.url).origin;
  let res = await env.ASSETS.fetch(new URL('/contact', origin));
  if (res.status >= 300 && res.status < 400) res = await env.ASSETS.fetch(new URL(res.headers.get('Location'), origin));

  const fullTitle = `${title} — Sisters of Saint Joseph of the Apparition`;
  const meta =
    `<link rel="stylesheet" href="/css/cms.css">` +
    (description ? `<meta name="description" content="${esc(description)}">` : '') +
    `<meta property="og:title" content="${esc(title)}">` +
    (description ? `<meta property="og:description" content="${esc(description)}">` : '') +
    (image ? `<meta property="og:image" content="${esc(image.startsWith('/') ? origin + image : image)}">` : '');

  const rewritten = new HTMLRewriter()
    .on('head', { element(el) { el.prepend('<base href="/">', { html: true }); el.append(meta, { html: true }); } })
    .on('title', { element(el) { el.setInnerContent(fullTitle); } })
    .on('body', { element(el) { el.setAttribute('data-page', label); } })
    .on('nav.crumbs', { element(el) { el.setInnerContent(crumbs, { html: true }); } })
    .on('div.block.wrap', { element(el) { el.setInnerContent(html, { html: true }); } })
    .on('div.card--map', { element(el) { el.remove(); } })
    .on('div.card--form', { element(el) { el.remove(); } })
    .transform(res);

  const out = new Response(rewritten.body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', ...headers } });
  return out;
}

export function crumbHtml(...trail) {
  const parts = ['<a href="/">Home</a>'];
  for (const t of trail) parts.push(t.href ? `<a href="${esc(t.href)}">${esc(t.label)}</a>` : `<span>${esc(t.label)}</span>`);
  return parts.join('<span class="sep">»</span>');
}

export function formatDate(iso) {
  const d = new Date(String(iso).replace(' ', 'T') + (String(iso).length <= 10 ? 'T00:00:00Z' : 'Z'));
  return isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
