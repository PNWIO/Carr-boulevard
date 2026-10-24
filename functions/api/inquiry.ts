import { bad, json, parseBody, readLead, verifyTurnstile, storeLead, notify, forwardLead, hasLegacyDelivery, type Env } from "../_lib";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.LEAD_INBOX && !hasLegacyDelivery(env)) {
    return bad("Online inquiries are not available yet. Please email ian@laughlindevelopmentllc.com or call 206.226.1988 to reach Ian directly.", 503);
  }
  const body = await parseBody(request);

  const ok = await verifyTurnstile(env, body["cf-turnstile-response"], request.headers.get("cf-connecting-ip"));
  if (!ok) return bad("We couldn't verify that request. Please try again.", 403);

  const lead = readLead(body);
  if (typeof lead === "string") return bad(lead);

  // Primary path: the lead-inbox Worker (D1 + email). KV/Resend stay as an optional second path.
  const forwarded = await forwardLead(env, "homesoncarr", "inquiry", lead, request);
  await storeLead(env, "inquiry", lead, request);
  await notify(env, `Carr Blvd — inquiry from ${lead.company}`, [
    `${lead.name}, ${lead.company}`,
    lead.email,
    lead.phone || "(no phone)",
    `Buyer type: ${lead.buyerType ?? "not given"}`,
    "",
    lead.message ?? "(no message)",
  ]);

  // storeLead/notify swallow their errors, so "delivered" is the relay result, or a configured legacy path.
  if (!forwarded && !hasLegacyDelivery(env)) {
    return bad("Online inquiries are not available yet. Please email ian@laughlindevelopmentllc.com or call 206.226.1988 to reach Ian directly.", 503);
  }

  return json({ ok: true });
};

export const onRequest: PagesFunction<Env> = async ({ request }) =>
  request.method === "POST" ? new Response(null, { status: 405 }) : bad("Method not allowed", 405);
