import { cookie, parseCookies, roleFor, sessionCookie } from '../../_lib/auth.js';

function back(request, error) {
  const headers = new Headers({ Location: `/admin/${error ? `?error=${error}` : ''}` });
  headers.append('Set-Cookie', cookie(request, 'sja_oauth', '', 0));
  return { headers };
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const expected = parseCookies(request).sja_oauth;
  if (!expected || expected !== url.searchParams.get('state') || !url.searchParams.get('code')) {
    return new Response(null, { status: 302, ...back(request, 'failed') });
  }

  /* The id_token comes straight from Google's token endpoint over TLS in answer
     to our client secret, so its claims can be trusted without re-verifying the
     signature (OpenID Connect Core §3.1.3.7). */
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: url.searchParams.get('code'),
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${url.origin}/api/auth/callback`,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) return new Response(null, { status: 302, ...back(request, 'failed') });

  let claims;
  try {
    const { id_token } = await tokenRes.json();
    const payload = id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    claims = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))));
  } catch {
    return new Response(null, { status: 302, ...back(request, 'failed') });
  }

  const valid =
    ['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss) &&
    claims.aud === env.GOOGLE_CLIENT_ID &&
    claims.exp > Date.now() / 1000 &&
    claims.email_verified === true &&
    typeof claims.email === 'string';
  if (!valid) return new Response(null, { status: 302, ...back(request, 'failed') });

  const email = claims.email.toLowerCase();
  if (!(await roleFor(env, email))) return new Response(null, { status: 302, ...back(request, 'denied') });

  const { headers } = back(request, '');
  headers.append('Set-Cookie', await sessionCookie(request, env, email));
  return new Response(null, { status: 302, headers });
}
