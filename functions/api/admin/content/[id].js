import { json, requireUser } from '../../../_lib/auth.js';
import { parseInput } from '../../../_lib/content.js';

async function load(env, id) {
  return env.DB.prepare('SELECT * FROM content WHERE id = ?').bind(Number(id)).first();
}

export async function onRequestGet({ request, env, params }) {
  const { response } = await requireUser(request, env);
  if (response) return response;
  const row = await load(env, params.id);
  return row ? json({ ...row, body: JSON.parse(row.body) }) : json({ error: 'Not found' }, 404);
}

export async function onRequestPut({ request, env, params }) {
  const { user, response } = await requireUser(request, env);
  if (response) return response;
  const existing = await load(env, params.id);
  if (!existing) return json({ error: 'Not found' }, 404);

  const input = parseInput(await request.json().catch(() => ({})), existing);
  if (input.response) return input.response;
  const v = input.value;
  try {
    await env.DB.prepare(
      `UPDATE content SET slug = ?, title = ?, excerpt = ?, body = ?, cover = ?, status = ?, show_in_menu = ?,
              menu_label = ?, published_at = ?, updated_at = datetime('now'), updated_by = ? WHERE id = ?`
    ).bind(v.slug, v.title, v.excerpt, v.body, v.cover, v.status, v.showInMenu, v.menuLabel, v.publishedAt, user.email, existing.id).run();
    return json({ id: existing.id, slug: v.slug });
  } catch (e) {
    if (String(e).includes('UNIQUE')) return json({ error: `The address "${v.slug}" is already used by another ${v.type}` }, 409);
    throw e;
  }
}

export async function onRequestDelete({ request, env, params }) {
  const { response } = await requireUser(request, env);
  if (response) return response;
  await env.DB.prepare('DELETE FROM content WHERE id = ?').bind(Number(params.id)).run();
  return json({ ok: true });
}
