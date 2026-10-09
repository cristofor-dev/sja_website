import { json, requireUser } from '../../_lib/auth.js';

/* SVG is left out on purpose: an SVG served from our own origin can carry script. */
const TYPES = {
  'image/jpeg': ['jpg', 8], 'image/png': ['png', 8], 'image/webp': ['webp', 8], 'image/gif': ['gif', 8],
  'application/pdf': ['pdf', 25],
};

export async function onRequestPost({ request, env }) {
  const { response } = await requireUser(request, env);
  if (response) return response;

  const form = await request.formData().catch(() => null);
  const file = form && form.get('file');
  if (!file || typeof file === 'string') return json({ error: 'No file received' }, 400);

  const kind = TYPES[file.type];
  if (!kind) return json({ error: 'Only JPEG, PNG, WebP, GIF images and PDF files can be uploaded' }, 415);
  if (file.size > kind[1] * 1024 * 1024) return json({ error: `That file is over ${kind[1]} MB` }, 413);

  const d = new Date();
  const key = `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${kind[0]}`;
  await env.MEDIA.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { name: file.name.slice(0, 120) },
  });
  return json({ url: `/media/${key}`, name: file.name, type: file.type }, 201);
}
