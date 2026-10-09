import { json, requireUser } from '../../../_lib/auth.js';
import { parseInput } from '../../../_lib/content.js';

export async function onRequestGet({ request, env }) {
  const { response } = await requireUser(request, env);
  if (response) return response;
  const type = new URL(request.url).searchParams.get('type');
  const where = type === 'page' || type === 'post' ? 'WHERE type = ?' : '';
  const stmt = env.DB.prepare(
    `SELECT id, type, slug, title, status, show_in_menu, published_at, updated_at, updated_by
       FROM content ${where} ORDER BY COALESCE(published_at, created_at) DESC, id DESC LIMIT 500`
  );
  const { results } = await (where ? stmt.bind(type) : stmt).all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  const { user, response } = await requireUser(request, env);
  if (response) return response;
  const input = parseInput(await request.json().catch(() => ({})));
  if (input.response) return input.response;
  const v = input.value;
  try {
    const row = await env.DB.prepare(
      `INSERT INTO content (type, slug, title, excerpt, body, cover, status, show_in_menu, menu_label, published_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
    ).bind(v.type, v.slug, v.title, v.excerpt, v.body, v.cover, v.status, v.showInMenu, v.menuLabel, v.publishedAt, user.email).first();
    return json({ id: row.id, slug: v.slug }, 201);
  } catch (e) {
    if (String(e).includes('UNIQUE')) return json({ error: `The address "${v.slug}" is already used by another ${v.type}` }, 409);
    throw e;
  }
}
