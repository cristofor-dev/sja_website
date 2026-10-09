import { json } from './auth.js';

export function slugify(s) {
  return String(s || '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

const MAX_BODY = 1_000_000;

/* Validate an editor payload; returns {value} or {response}. */
export function parseInput(data, existing = null) {
  const type = existing ? existing.type : data.type;
  if (!['page', 'post'].includes(type)) return { response: json({ error: 'type must be "page" or "post"' }, 400) };

  const title = String(data.title ?? existing?.title ?? '').trim();
  if (!title) return { response: json({ error: 'A title is required' }, 400) };

  const slug = slugify(data.slug || existing?.slug || title);
  if (!slug) return { response: json({ error: 'The title does not make a usable address' }, 400) };

  let body = data.body ?? existing?.body ?? { type: 'doc', content: [] };
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || body.type !== 'doc') return { response: json({ error: 'body must be a document' }, 400) };
  body = JSON.stringify(body);
  if (body.length > MAX_BODY) return { response: json({ error: 'The content is too large' }, 413) };

  const status = data.status ?? existing?.status ?? 'draft';
  if (!['draft', 'published'].includes(status)) return { response: json({ error: 'bad status' }, 400) };

  const cover = data.cover ? String(data.cover) : null;
  if (cover && !/^(\/media\/|https:\/\/)/.test(cover)) return { response: json({ error: 'bad cover address' }, 400) };

  let publishedAt = data.published_at ?? existing?.published_at ?? null;
  if (publishedAt && isNaN(Date.parse(publishedAt))) return { response: json({ error: 'bad date' }, 400) };
  if (status === 'published' && !publishedAt) publishedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

  return {
    value: {
      type, slug, title: title.slice(0, 200), body, status, cover, publishedAt,
      excerpt: String(data.excerpt ?? existing?.excerpt ?? '').slice(0, 400),
      showInMenu: type === 'page' && (data.show_in_menu ?? existing?.show_in_menu) ? 1 : 0,
      menuLabel: String(data.menu_label ?? existing?.menu_label ?? '').trim().slice(0, 60) || null,
    },
  };
}
