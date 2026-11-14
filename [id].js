// GET /img/<id>  ->  serves an uploaded image from R2, cached on Cloudflare's network
export async function onRequestGet({ request, params, env, waitUntil }) {
  if (!/^[a-f0-9]{32}\.(jpg|png|gif|webp)$/.test(params.id)) return new Response('Not found', { status: 404 });
  const cache = caches.default;
  const hit = await cache.match(request);
  if (hit) return hit;
  const obj = env.IMAGES && (await env.IMAGES.get('u/' + params.id));
  if (!obj) return new Response('Not found', { status: 404 });
  const res = new Response(obj.body, {
    headers: {
      'content-type': obj.httpMetadata?.contentType || 'application/octet-stream',
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
    },
  });
  waitUntil(cache.put(request, res.clone()));
  return res;
}
