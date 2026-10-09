import { cookie, isLocal, sessionCookie, roleFor } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  /* Local development only: skip Google when DEV_LOGIN_EMAIL is set in .dev.vars.
     The hostname check means a production deploy can never take this path. */
  if (isLocal(request) && env.DEV_LOGIN_EMAIL) {
    if (!(await roleFor(env, env.DEV_LOGIN_EMAIL))) {
      return Response.redirect(`${url.origin}/admin/?error=denied`, 302);
    }
    const headers = new Headers({ Location: '/admin/' });
    headers.append('Set-Cookie', await sessionCookie(request, env, env.DEV_LOGIN_EMAIL));
    return new Response(null, { status: 302, headers });
  }

  if (!env.GOOGLE_CLIENT_ID) return new Response('GOOGLE_CLIENT_ID is not configured', { status: 500 });

  const state = crypto.randomUUID();
  const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  auth.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${url.origin}/api/auth/callback`,
    response_type: 'code',
    scope: 'openid email',
    state,
    prompt: 'select_account',
  }).toString();

  const headers = new Headers({ Location: auth.toString() });
  headers.append('Set-Cookie', cookie(request, 'sja_oauth', state, 600));
  return new Response(null, { status: 302, headers });
}
