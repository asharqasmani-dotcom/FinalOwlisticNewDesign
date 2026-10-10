import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { readDraft, saveDraft, deleteDraft, validId, validateAnswers, type Draft } from "@/lib/enquiries";

export const dynamic = "force-dynamic";
const COOKIE = "owlistic-enquiry-id";
function idFrom(request: Request) {
  const id = (request.headers.get("cookie") || "").split(";").map(s => s.trim()).find(s => s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) || "";
  return validId(id) ? id : "";
}
function json(data: unknown, status = 200, id?: string) {
  const response = NextResponse.json(data, {status, headers: {"Cache-Control": "no-store"}});
  if (id !== undefined) response.cookies.set(COOKIE, id, {httpOnly:true, sameSite:"lax", secure:process.env.NODE_ENV === "production", path:"/", maxAge:id ? 14 * 86400 : 0});
  return response;
}
function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return ["http:", "https:"].includes(url.protocol) && url.host === request.headers.get("host");
  } catch { return false; }
}
export async function GET(request: Request) {
  try {
    const draft = await readDraft(idFrom(request));
    return json(draft ? {saved:true, ...draft} : {saved:false, complete:false});
  } catch { return json({error:"Saved details are temporarily unavailable. Please try again."}, 503); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({error:"Invalid request origin."}, 403);
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 20000) return json({error:"Request is too large."}, 413);
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
  } catch { return json({error:"Invalid request body."}, 400); }
  const id = idFrom(request) || randomUUID();
  try {
    const existing = await readDraft(id);
    if (body.action === "withdraw-permission") {
      if (existing) { existing.answers.followUpConsent = false; existing.updatedAt = new Date().toISOString(); await saveDraft(id, existing); }
      return json({ok:true});
    }
    const step = body.step;
    if (!Number.isInteger(step) || step < 1 || step > 3) return json({error:"Invalid step."}, 400);
    const answers = validateAnswers(body.answers, step);
    if (!answers || body.websiteConfirmation) return json({error:"Please check your answers and try again."}, 400);
    if (existing?.complete) return json({saved:true, complete:true, measurementId:existing.measurementId, step:3}, 200, id);
    const draft: Draft = {answers,step,complete:false,measurementId:existing?.measurementId || randomUUID(),updatedAt:new Date().toISOString()};
    await saveDraft(id, draft);
    if (step === 3) {
      // Only show 'received' after the configured destination acknowledges delivery.
      const webhook = process.env.ENQUIRY_WEBHOOK_URL;
      if (!webhook) return json({error:"Your details are saved, but online delivery is unavailable. Please email Ashar@owlisticstudio.com to send your enquiry."}, 503, id);
      const delivered = await fetch(webhook, {method:"POST", headers:{"Content-Type":"application/json", "Idempotency-Key":draft.measurementId!, ...(process.env.ENQUIRY_WEBHOOK_TOKEN ? {Authorization:`Bearer ${process.env.ENQUIRY_WEBHOOK_TOKEN}`} : {})}, body:JSON.stringify({id:draft.measurementId, answers}), signal:AbortSignal.timeout(10000)});
      if (!delivered.ok) return json({error:"Delivery failed. Your details are saved; please try again or email Ashar@owlisticstudio.com."}, 502, id);
      draft.complete = true;
      await saveDraft(id, draft);
    }
    return json({saved:true,complete:draft.complete,measurementId:draft.measurementId,step}, 200, id);
  } catch { return json({error:"We could not save or deliver your enquiry. Please try again or email Ashar@owlisticstudio.com."}, 503, id); }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return json({error:"Invalid request origin."}, 403);
  try { await deleteDraft(idFrom(request)); return json({ok:true,saved:false,complete:false}, 200, ""); }
  catch { return json({error:"We could not clear your draft. Please try again."}, 503); }
}
