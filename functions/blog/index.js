import { currentUser } from '../_lib/auth.js';
import { crumbHtml, esc, formatDate, plainText, renderShell } from '../_lib/render.js';

const PER_PAGE = 10;

export async function onRequestGet(ctx) {
  const { request, env } = ctx;
  const page = Math.max(1, parseInt(new URL(request.url).searchParams.get('page'), 10) || 1);
  const { results } = await env.DB.prepare(
    `SELECT slug, title, excerpt, cover, body, published_at FROM content
      WHERE type = 'post' AND status = 'published' AND published_at <= datetime('now')
      ORDER BY published_at DESC, id DESC LIMIT ? OFFSET ?`
  ).bind(PER_PAGE + 1, (page - 1) * PER_PAGE).all();

  const more = results.length > PER_PAGE;
  const items = results.slice(0, PER_PAGE).map((p) => `
    <article class="news-item cms-post">
      ${p.cover ? `<a href="/blog/${esc(p.slug)}"><img class="cms-post__cover" src="${esc(p.cover)}" alt="" loading="lazy"></a>` : ''}
      <div class="news-item__date">${esc(formatDate(p.published_at))}</div>
      <a class="news-item__title" href="/blog/${esc(p.slug)}">${esc(p.title)}</a>
      <p class="cms-post__excerpt">${esc(p.excerpt || plainText(p.body))}</p>
    </article>`).join('');

  const nav = (page > 1 || more)
    ? `<p class="cms-pager">${page > 1 ? `<a href="/blog?page=${page - 1}">‹ Newer</a>` : '<span></span>'}${more ? `<a href="/blog?page=${page + 1}">Older ›</a>` : ''}</p>`
    : '';

  const html = `<h1 class="title">Blog</h1><div class="rule"></div>${items || '<p class="empty">No posts yet.</p>'}${nav}`;
  const user = await currentUser(request, env);
  return renderShell(ctx, {
    title: 'Blog', label: 'Blog', crumbs: crumbHtml({ label: 'Blog' }), html,
    headers: { 'Cache-Control': user ? 'private, no-store' : 'public, max-age=60' },
  });
}
