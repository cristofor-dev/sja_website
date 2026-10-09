import { currentUser, json } from '../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  const user = await currentUser(request, env);
  return user ? json(user) : json({ error: 'Not signed in' }, 401);
}
