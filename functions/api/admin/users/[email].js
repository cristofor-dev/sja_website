import { json, ownerEmails, requireUser } from '../../../_lib/auth.js';

export async function onRequestDelete({ request, env, params }) {
  const { user, response } = await requireUser(request, env, { admin: true });
  if (response) return response;
  const email = decodeURIComponent(params.email).toLowerCase();
  if (ownerEmails(env).includes(email)) return json({ error: 'Owners are set in ADMIN_EMAILS and cannot be removed here' }, 400);
  if (email === user.email) return json({ error: 'You cannot remove yourself' }, 400);
  await env.DB.prepare('DELETE FROM users WHERE email = ?').bind(email).run();
  return json({ ok: true });
}
