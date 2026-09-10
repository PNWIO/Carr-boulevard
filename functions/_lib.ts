/// <reference types="@cloudflare/workers-types" />

export interface Env {
  LEADS?: KVNamespace;
  DOCS?: R2Bucket;
  HMAC_SECRET?: string;
  TURNSTILE_SECRET_KEY?: string;
  RESEND_API_KEY?: string;
  LEAD_NOTIFY_TO?: string;
  LEAD_NOTIFY_FROM?: string;
}

export const COOKIE = "cb_access";
export const TTL_DAYS = 30;

export const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });

export const bad = (message: string, status = 400) => json({ ok: false, message }, status);

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export type Lead = {
  name: string;
  company: string;
  email: string;
  phone: string;
  buyerType?: string;
  message?: string;
};

export function readLead(body: Record<string, unknown>, opts: { requireAck?: boolean } = {}): Lead | string {
  const s = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const name = s(body.name, 120);
  const company = s(body.company, 160);
  const email = s(body.email, 200);
  const phone = s(body.phone, 60);

  if (name.length < 2) return "Please give a name we can reply to.";
  if (company.length < 2) return "Please tell us which company you're with.";
  if (!EMAIL.test(email)) return "That email address doesn't look right.";
  if (opts.requireAck && !body.ack) return "Please acknowledge the confidentiality note.";

  return {
    name,
    company,
    email,
    phone,
    buyerType: s(body.buyerType, 40) || undefined,
    message: s(body.message, 4000) || undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Turnstile — skipped when no secret is configured (fail soft)        */
/* ------------------------------------------------------------------ */

export async function verifyTurnstile(env: Env, token: unknown, ip: string | null): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (typeof token !== "string" || !token) return false;
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET_KEY);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Signed access cookie                                                */
/* ------------------------------------------------------------------ */

const enc = new TextEncoder();

async function key(secret: string) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function signAccess(env: Env, email: string): Promise<string | null> {
  if (!env.HMAC_SECRET) return null;
  const exp = Date.now() + TTL_DAYS * 864e5;
  const payload = `${b64url(enc.encode(email).buffer as ArrayBuffer)}.${exp}`;
  const sig = b64url(await crypto.subtle.sign("HMAC", await key(env.HMAC_SECRET), enc.encode(payload)));
  return `${payload}.${sig}`;
}

export async function verifyAccess(env: Env, token: string | undefined): Promise<boolean> {
  if (!env.HMAC_SECRET || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [id, expRaw, sig] = parts as [string, string, string];
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = b64url(await crypto.subtle.sign("HMAC", await key(env.HMAC_SECRET), enc.encode(`${id}.${expRaw}`)));
  // constant-time-ish compare
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

export const cookieHeader = (value: string) =>
  `${COOKIE}=${value}; Path=/; Max-Age=${TTL_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`;

export const readCookie = (req: Request, name: string): string | undefined =>
  req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);

/* ------------------------------------------------------------------ */
/* Persistence + notification — both optional, both fail soft          */
/* ------------------------------------------------------------------ */

export async function storeLead(env: Env, kind: string, lead: Lead, req: Request): Promise<void> {
  if (!env.LEADS) return;
  const at = new Date().toISOString();
  const record = {
    ...lead,
    kind,
    at,
    ip: req.headers.get("cf-connecting-ip") ?? undefined,
    country: (req as { cf?: { country?: string } }).cf?.country,
    referer: req.headers.get("referer") ?? undefined,
  };
  try {
    await env.LEADS.put(`${kind}:${at}:${lead.email}`, JSON.stringify(record), {
      metadata: { name: lead.name, company: lead.company },
    });
  } catch {
    /* a lead that fails to persist must not fail the request */
  }
}

export async function notify(env: Env, subject: string, lines: string[]): Promise<void> {
  const to = env.LEAD_NOTIFY_TO;
  const from = env.LEAD_NOTIFY_FROM;
  if (!env.RESEND_API_KEY || !to || !from) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to, subject, text: lines.join("\n") }),
    });
  } catch {
    /* notification is best effort */
  }
}

export async function parseBody(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    return (await request.json().catch(() => ({}))) as Record<string, unknown>;
  }
  const form = await request.formData().catch(() => null);
  return form ? (Object.fromEntries(form) as Record<string, unknown>) : {};
}
