// GET /img/<id>  ->  serves an uploaded image (from KV or R2), cached on Cloudflare's network
const isKV = (b) => typeof b.getWithMetadata === 'function';

export async function onRequestGet({ request, params, env, waitUntil }) {
  if (!/^[a-f0-9]{32}\.(jpg|png|gif|webp)$/.test(params.id)) return new Response('Not found', { status: 404 });
  if (!env.IMAGES) return new Response('Not found', { status: 404 });
  const cache = caches.default;
  const hit = await cache.match(request);
  if (hit) return hit;
  let body, type;
  if (isKV(env.IMAGES)) {
    const r = await env.IMAGES.getWithMetadata('u/' + params.id, { type: 'arrayBuffer' });
    body = r.value; type = r.metadata && r.metadata.type;
  } else {
    const o = await env.IMAGES.get('u/' + params.id);
    body = o && o.body; type = o && o.httpMetadata && o.httpMetadata.contentType;
  }
  if (!body) return new Response('Not found', { status: 404 });
  const res = new Response(body, {
    headers: {
      'content-type': type || 'application/octet-stream',
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
    },
  });
  waitUntil(cache.put(request, res.clone()));
  return res;
}
