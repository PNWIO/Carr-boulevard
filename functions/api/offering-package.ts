import { COOKIE, readCookie, verifyAccess, type Env } from "../_lib";

/** The merged offering package — the primary call to action inside the data room. */
const KEY = "package/carr-boulevard-offering-package.pdf";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const allowed = await verifyAccess(env, readCookie(request, COOKIE));
  if (!allowed) {
    return new Response(null, { status: 302, headers: { location: "/data-room#data-room", "cache-control": "no-store" } });
  }
  if (!env.DOCS) {
    return new Response("The offering package isn't uploaded yet. Email ian@laughlindevelopmentllc.com.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }
  const object = await env.DOCS.get(KEY);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "private, max-age=0, must-revalidate");
  headers.set("content-disposition", 'attachment; filename="Carr-Boulevard-Offering-Package.pdf"');
  return new Response(object.body, { headers });
};
