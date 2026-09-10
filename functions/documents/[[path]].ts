import { COOKIE, readCookie, verifyAccess, type Env } from "../_lib";

/**
 * Streams a gated document from R2 only when the access cookie checks out.
 * Gated PDFs live in the DOCS bucket, never in /public — anything in /public is
 * world-readable no matter what the front end does.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const segs = params.path;
  const key = Array.isArray(segs) ? segs.join("/") : String(segs ?? "");
  if (!key || key.includes("..")) return new Response("Not found", { status: 404 });

  const allowed = await verifyAccess(env, readCookie(request, COOKIE));
  if (!allowed) {
    return new Response(null, { status: 302, headers: { location: "/data-room#data-room", "cache-control": "no-store" } });
  }

  if (!env.DOCS) {
    return new Response("The document store isn't configured yet. Email ian@laughlindevelopmentllc.com.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }

  const object = await env.DOCS.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "private, max-age=0, must-revalidate");
  headers.set("content-disposition", `inline; filename="${key.split("/").pop()}"`);
  return new Response(object.body, { headers });
};
