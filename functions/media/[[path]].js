/* Uploaded images and PDFs, straight from R2. Keys are random UUIDs and never
   reused, so they can be cached for good. */
export async function onRequestGet({ env, params }) {
  const key = Array.isArray(params.path) ? params.path.join('/') : params.path;
  if (!key || key.includes('..')) return new Response('Not found', { status: 404 });
  const obj = await env.MEDIA.get(key);
  if (!obj) return new Response('Not found', { status: 404 });
  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      ETag: obj.httpEtag,
    },
  });
}
