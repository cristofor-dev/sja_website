import { clearSessionCookie, json } from '../../_lib/auth.js';

/* POST only, so another site cannot sign people out with an <img> tag */
export async function onRequestPost({ request }) {
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie(request) });
}
