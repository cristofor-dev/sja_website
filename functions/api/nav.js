import { json } from '../_lib/auth.js';

/* Pages flagged "show in menu", for the drawer (docs/js/site.js appends them) */
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT slug, COALESCE(NULLIF(menu_label, ''), title) AS label
       FROM content WHERE type = 'page' AND status = 'published' AND show_in_menu = 1
      ORDER BY label COLLATE NOCASE`
  ).all();
  return json(results.map((r) => ({ label: r.label, href: `/p/${r.slug}` })), 200, { 'Cache-Control': 'public, max-age=60' });
}
