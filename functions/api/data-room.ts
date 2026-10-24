import {
  bad, json, parseBody, readLead, verifyTurnstile, signAccess,
  cookieHeader, storeLead, notify, forwardLead, hasLegacyDelivery, type Env,
} from "../_lib";

/**
 * Grants data-room access in exchange for identifying details.
 * This is lead capture, not security: the signed cookie stops casual sharing of
 * gated document URLs and nothing more. Anything genuinely confidential should
 * not be in the bucket at all.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // Without a lead store or email delivery, nothing would reach Ian. Say so, so the
  // page falls back to the visitor's email instead of claiming the request was sent.
  if (!env.LEAD_INBOX && !hasLegacyDelivery(env)) {
    return bad("Online requests are not connected yet. Your email app will open with your details — send it and Ian will reply with the package.", 503);
  }
  const body = await parseBody(request);

  const ok = await verifyTurnstile(env, body["cf-turnstile-response"], request.headers.get("cf-connecting-ip"));
  if (!ok) return bad("We couldn't verify that request. Please try again.", 403);

  const lead = readLead(body, { requireAck: true });
  if (typeof lead === "string") return bad(lead);

  // Primary path: the lead-inbox Worker (D1 + email). KV/Resend stay as an optional second path.
  const forwarded = await forwardLead(env, "homesoncarr", "data-room", lead, request);
  await storeLead(env, "data-room", lead, request);
  await notify(env, `Carr Blvd — data room access: ${lead.company}`, [
    `${lead.name}, ${lead.company}`,
    lead.role || "(role not provided)",
    lead.email,
    lead.phone || "(no phone)",
    lead.message || "(no comment)",
    "",
    "Granted access to the Carr Boulevard data room.",
  ]);

  // storeLead/notify swallow their errors, so "delivered" is the relay result, or a configured legacy path.
  if (!forwarded && !hasLegacyDelivery(env)) {
    return bad("Online requests are not connected yet. Your email app will open with your details — send it and Ian will reply with the package.", 503);
  }

  const token = await signAccess(env, lead.email);
  if (!token) {
    // No HMAC_SECRET configured: the lead is captured, but the gate can't issue a
    // cookie. Tell the caller plainly rather than pretending access was granted.
    return json(
      { ok: false, message: "Your details reached Ian — he'll send the package by email shortly." },
      503,
    );
  }

  return json({ ok: true }, 200, { "set-cookie": cookieHeader(token) });
};

export const onRequest: PagesFunction<Env> = async ({ request }) =>
  request.method === "POST" ? new Response(null, { status: 405 }) : bad("Method not allowed", 405);
