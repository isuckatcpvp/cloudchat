// POST /upload  ->  stores an image in the R2 bucket bound as IMAGES, returns { url }
const MAX = 2 * 1024 * 1024;
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };

export async function onRequestPost({ request, env }) {
  if (!env.IMAGES) return new Response('R2 bucket not bound', { status: 500 });
  const type = (request.headers.get('content-type') || '').split(';')[0].trim();
  if (!EXT[type]) return new Response('Unsupported type', { status: 415 });
  if ((+request.headers.get('content-length') || 0) > MAX) return new Response('Too large', { status: 413 });
  const buf = await request.arrayBuffer();
  if (buf.byteLength > MAX || buf.byteLength < 100) return new Response('Bad size', { status: 413 });
  const id = crypto.randomUUID().replaceAll('-', '') + '.' + EXT[type];
  await env.IMAGES.put('u/' + id, buf, { httpMetadata: { contentType: type } });
  return Response.json({ url: new URL('/img/' + id, request.url).pathname });
}
