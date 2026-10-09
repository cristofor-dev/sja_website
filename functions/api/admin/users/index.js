import { json, ownerEmails, requireUser } from '../../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  const { response } = await requireUser(request, env, { admin: true });
  if (response) return response;
  const { results } = await env.DB.prepare('SELECT email, role, created_at FROM users ORDER BY email').all();
  const owners = ownerEmails(env).map((email) => ({ email, role: 'admin', owner: true }));
  return json([...owners, ...results]);
}

export async function onRequestPost({ request, env }) {
  const { response } = await requireUser(request, env, { admin: true });
  if (response) return response;
  const data = await request.json().catch(() => ({}));
  const email = String(data.email || '').trim().toLowerCase();
  const role = data.role === 'admin' ? 'admin' : 'editor';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Enter a valid e-mail address' }, 400);
  await env.DB.prepare(
    'INSERT INTO users (email, role) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET role = excluded.role'
  ).bind(email, role).run();
  return json({ email, role }, 201);
}
