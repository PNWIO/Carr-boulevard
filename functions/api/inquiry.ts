import { bad, json, parseBody, readLead, verifyTurnstile, storeLead, notify, type Env } from "../_lib";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.LEADS && !(env.RESEND_API_KEY && env.LEAD_NOTIFY_TO && env.LEAD_NOTIFY_FROM)) {
    return bad("Online enquiries are not available yet. Please email ian@laughlindevelopmentllc.com or call 206.226.1988 to reach Ian directly.", 503);
  }
  const body = await parseBody(request);

  const ok = await verifyTurnstile(env, body["cf-turnstile-response"], request.headers.get("cf-connecting-ip"));
  if (!ok) return bad("We couldn't verify that request. Please try again.", 403);

  const lead = readLead(body);
  if (typeof lead === "string") return bad(lead);

  await storeLead(env, "inquiry", lead, request);
  await notify(env, `Carr Blvd — enquiry from ${lead.company}`, [
    `${lead.name}, ${lead.company}`,
    lead.email,
    lead.phone || "(no phone)",
    `Buyer type: ${lead.buyerType ?? "not given"}`,
    "",
    lead.message ?? "(no message)",
  ]);

  return json({ ok: true });
};

export const onRequest: PagesFunction<Env> = async ({ request }) =>
  request.method === "POST" ? new Response(null, { status: 405 }) : bad("Method not allowed", 405);
