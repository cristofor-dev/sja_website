import { currentUser } from './auth.js';
import { crumbHtml, esc, formatDate, plainText, renderDoc, renderShell } from './render.js';

/* One published page or post. Signed-in editors can also open drafts, with a banner. */
export async function renderSingle(ctx, type) {
  const { request, env, params } = ctx;
  const row = await env.DB.prepare('SELECT * FROM content WHERE type = ? AND slug = ?').bind(type, params.slug).first();
  const user = await currentUser(request, env);
  const live = row && row.status === 'published' && (type === 'page' || row.published_at <= new Date().toISOString().slice(0, 19).replace('T', ' '));

  if (!row || (!live && !user)) {
    return renderShell(ctx, {
      title: 'Not found', label: '', status: 404, crumbs: crumbHtml({ label: 'Not found' }),
      html: `<h1 class="title">Page not found</h1><div class="rule"></div><p>We could not find that page. <a href="/">Back to the home page</a>.</p>`,
    });
  }

  const isPost = type === 'post';
  const banner = live ? '' : `<p class="cms-preview">Preview — this ${type} is not published yet.</p>`;
  const html =
    `${banner}<h1 class="title">${esc(row.title)}</h1><div class="rule"></div>` +
    (isPost && row.published_at ? `<div class="news-item__date cms-date">${esc(formatDate(row.published_at))}</div>` : '') +
    (row.cover ? `<figure class="cms-cover"><img src="${esc(row.cover)}" alt=""></figure>` : '') +
    `<div class="cms-prose">${renderDoc(row.body)}</div>`;

  return renderShell(ctx, {
    title: row.title,
    label: isPost ? 'Blog' : row.title,
    crumbs: isPost ? crumbHtml({ label: 'Blog', href: '/blog' }, { label: row.title }) : crumbHtml({ label: row.title }),
    html,
    description: row.excerpt || plainText(row.body, 160),
    image: row.cover || '',
    headers: { 'Cache-Control': live && !user ? 'public, max-age=60' : 'private, no-store' },
  });
}
