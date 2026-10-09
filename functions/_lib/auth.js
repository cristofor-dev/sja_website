/* Sessions are a signed cookie (HMAC-SHA256 over {email, exp}); the role is
   looked up on every request, so removing someone from the allow-list takes
   effect at once. */

const enc = new TextEncoder();
const COOKIE = 'sja_session';
const SESSION_SECONDS = 60 * 60 * 24 * 7;

function toB64u(bytes) {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64u(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmacKey(env) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET must be set (at least 32 characters)');
  }
  return crypto.subtle.importKey('raw', enc.encode(env.SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export function parseCookies(request) {
  const out = {};
  for (const part of (request.headers.get('Cookie') || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function isLocal(request) {
  const h = new URL(request.url).hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
}

export function cookie(request, name, value, maxAge) {
  const attrs = ['Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAge}`];
  if (!isLocal(request)) attrs.push('Secure');
  return `${name}=${encodeURIComponent(value)}; ${attrs.join('; ')}`;
}

export async function sessionCookie(request, env, email) {
  const body = toB64u(enc.encode(JSON.stringify({ e: email, x: Math.floor(Date.now() / 1000) + SESSION_SECONDS })));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(env), enc.encode(body));
  return cookie(request, COOKIE, `${body}.${toB64u(sig)}`, SESSION_SECONDS);
}

export function clearSessionCookie(request) {
  return cookie(request, COOKIE, '', 0);
}

export function ownerEmails(env) {
  return (env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

/* the role of an e-mail address, or null when it is not on the allow-list */
export async function roleFor(env, email) {
  email = String(email || '').toLowerCase();
  if (ownerEmails(env).includes(email)) return 'admin';
  const row = await env.DB.prepare('SELECT role FROM users WHERE email = ?').bind(email).first();
  return row ? row.role : null;
}

export async function currentUser(request, env) {
  const raw = parseCookies(request)[COOKIE];
  if (!raw) return null;
  const [body, sig] = raw.split('.');
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(env), fromB64u(sig), enc.encode(body));
    if (!ok) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64u(body)));
    if (!data.e || data.x < Date.now() / 1000) return null;
    const role = await roleFor(env, data.e);
    return role ? { email: data.e, role } : null;
  } catch {
    return null;
  }
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

/* Guard for /api/admin/*: signs-in required; changes also need the custom
   header, which a cross-site form or fetch cannot send (CSRF defence on top
   of SameSite=Lax). Returns {user} or {response}. */
export async function requireUser(request, env, { admin = false } = {}) {
  const user = await currentUser(request, env);
  if (!user) return { response: json({ error: 'Not signed in' }, 401) };
  if (admin && user.role !== 'admin') return { response: json({ error: 'Admins only' }, 403) };
  if (!['GET', 'HEAD'].includes(request.method) && request.headers.get('X-Requested-With') !== 'sja-admin') {
    return { response: json({ error: 'Missing X-Requested-With header' }, 400) };
  }
  return { user };
}
